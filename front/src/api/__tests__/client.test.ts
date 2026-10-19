import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import client from '../client'

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
