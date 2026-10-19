import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from 'axios'
import client from '../client'

const telemetry = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  tracingHeaders: vi.fn((): Record<string, string> => ({})),
}))
vi.mock('@/lib/telemetry', () => ({ ...telemetry, SLOW_REQUEST_MS: 1000 }))

const fakeLocation = { pathname: '/library', href: 'http://app.test/library' }

function respondWith(status: number) {
  client.defaults.adapter = (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError('fail', 'ERR', config, null, {
        status,
        statusText: '',
        headers: {},
        config: { ...config, headers: new AxiosHeaders() },
        data: { error: 'nope' },
      }),
    )
}

beforeEach(() => {
  fakeLocation.pathname = '/library'
  fakeLocation.href = 'http://app.test/library'
  vi.stubGlobal('location', fakeLocation)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client 401 handling', () => {
  it('redirects to login when a request is unauthorized', async () => {
    respondWith(401)
    await expect(client.get('/playlists')).rejects.toBeInstanceOf(AxiosError)
    expect(fakeLocation.href).toBe('/login')
  })

  it('does not redirect for the session probe', async () => {
    respondWith(401)
    await expect(client.get('/auth/me')).rejects.toBeInstanceOf(AxiosError)
    expect(fakeLocation.href).toBe('http://app.test/library')
  })

  it('does not redirect while already on the login page', async () => {
    fakeLocation.pathname = '/login'
    respondWith(401)
    await expect(client.post('/auth/login')).rejects.toBeInstanceOf(AxiosError)
    expect(fakeLocation.href).toBe('http://app.test/library')
  })

  it('leaves other errors alone', async () => {
    respondWith(403)
    await expect(client.get('/admin/listeners')).rejects.toBeInstanceOf(AxiosError)
    expect(fakeLocation.href).toBe('http://app.test/library')
  })
})

describe('api client telemetry', () => {
  let seenHeaders: AxiosHeaders | undefined

  function succeedAfter(ms: number) {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const value = now
      now += ms
      return value
    })
    client.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      seenHeaders = config.headers
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: { 'x-request-id': 'req-1' },
        config,
        data: {},
      })
    }
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches the posthog tracing headers', async () => {
    telemetry.tracingHeaders.mockReturnValue({ 'X-POSTHOG-SESSION-ID': 'session-1' })
    succeedAfter(10)
    await client.get('/playlists')
    expect(seenHeaders?.get('X-POSTHOG-SESSION-ID')).toBe('session-1')
  })

  it('reports requests slower than the threshold', async () => {
    succeedAfter(1500)
    await client.get('/music/tracks')
    expect(telemetry.trackEvent).toHaveBeenCalledWith('api_request_slow', {
      source: 'client',
      method: 'GET',
      url: '/music/tracks',
      status: 200,
      duration_ms: 1500,
      request_id: 'req-1',
    })
  })

  it('ignores fast requests', async () => {
    succeedAfter(50)
    await client.get('/music/tracks')
    expect(telemetry.trackEvent).not.toHaveBeenCalled()
  })

  it('reports requests that never got a response', async () => {
    client.defaults.adapter = (config: InternalAxiosRequestConfig) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config))
    await expect(client.post('/parties')).rejects.toBeInstanceOf(AxiosError)
    expect(telemetry.trackEvent).toHaveBeenCalledWith(
      'api_request_network_error',
      expect.objectContaining({ method: 'POST', url: '/parties', code: 'ERR_NETWORK', message: 'Network Error' }),
    )
  })

  it('ignores cancelled requests and responses with a status', async () => {
    client.defaults.adapter = () => Promise.reject(new CanceledError())
    await expect(client.get('/music/tracks')).rejects.toBeInstanceOf(CanceledError)
    respondWith(500)
    await expect(client.get('/music/tracks')).rejects.toBeInstanceOf(AxiosError)
    expect(telemetry.trackEvent).not.toHaveBeenCalled()
  })
})
