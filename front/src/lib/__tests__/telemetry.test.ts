import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type { UserResponse } from '@/api/types'

const posthog = vi.hoisted(() => ({
  init: vi.fn(),
  register: vi.fn(),
  captureException: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  get_session_id: vi.fn(() => 'session-1'),
  get_distinct_id: vi.fn(() => 'distinct-1'),
}))
vi.mock('posthog-js', () => ({ default: posthog }))

const config = { key: 'phc_test', host: '/ingest', environment: 'test', appVersion: 'v1' }
const user: UserResponse = { id: 'u-1', username: 'bob', role: 'LISTENER' }

const flush = () => new Promise((resolve) => setTimeout(resolve))

async function loadTelemetry() {
  vi.resetModules()
  return import('../telemetry')
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('telemetry without a key', () => {
  it('stays disabled and turns every helper into a no-op', async () => {
    const telemetry = await loadTelemetry()
    expect(await telemetry.initTelemetry({ ...config, key: '' })).toBe(false)

    telemetry.captureException(new Error('boom'))
    telemetry.trackEvent('api_request_slow', {})
    telemetry.identifyUser(user)
    telemetry.resetIdentity()
    await flush()

    expect(posthog.init).not.toHaveBeenCalled()
    expect(posthog.captureException).not.toHaveBeenCalled()
    expect(posthog.capture).not.toHaveBeenCalled()
    expect(posthog.identify).not.toHaveBeenCalled()
    expect(posthog.reset).not.toHaveBeenCalled()
    expect(telemetry.tracingHeaders()).toEqual({})
  })
})

describe('telemetry with a key', () => {
  it('initialises posthog for error tracking and session replay only', async () => {
    const telemetry = await loadTelemetry()
    expect(await telemetry.initTelemetry(config)).toBe(true)

    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: '/ingest',
        person_profiles: 'identified_only',
        capture_pageview: false,
        autocapture: false,
        capture_exceptions: true,
        session_recording: { maskAllInputs: true },
      }),
    )
    expect(posthog.register).toHaveBeenCalledWith({
      service: 'choons-front',
      environment: 'test',
      app_version: 'v1',
    })
  })

  it('forwards exceptions, events and identity', async () => {
    const telemetry = await loadTelemetry()
    await telemetry.initTelemetry(config)
    const error = new Error('boom')

    telemetry.captureException(error, { kind: 'router' })
    telemetry.trackEvent('api_request_slow', { duration_ms: 1200 })
    telemetry.identifyUser(user)
    telemetry.resetIdentity()

    expect(posthog.captureException).toHaveBeenCalledWith(error, { kind: 'router' })
    expect(posthog.capture).toHaveBeenCalledWith('api_request_slow', { duration_ms: 1200 })
    expect(posthog.identify).toHaveBeenCalledWith('u-1', { username: 'bob', role: 'LISTENER' })
    expect(posthog.reset).toHaveBeenCalled()
  })

  it('queues calls made while posthog is still loading', async () => {
    const telemetry = await loadTelemetry()
    const ready = telemetry.initTelemetry(config)
    const error = new Error('early')

    telemetry.captureException(error)
    expect(telemetry.tracingHeaders()).toEqual({})

    await ready
    await flush()
    expect(posthog.captureException).toHaveBeenCalledWith(error, undefined)
  })

  it('exposes session and distinct ids as request headers', async () => {
    const telemetry = await loadTelemetry()
    await telemetry.initTelemetry(config)
    expect(telemetry.tracingHeaders()).toEqual({
      'X-POSTHOG-SESSION-ID': 'session-1',
      'X-POSTHOG-DISTINCT-ID': 'distinct-1',
    })
  })

  it('identifies on sign in and resets only after a sign out', async () => {
    const telemetry = await loadTelemetry()
    await telemetry.initTelemetry(config)
    const current = ref<UserResponse | null>(null)

    const stop = telemetry.bindIdentity(() => current.value)
    expect(posthog.reset).not.toHaveBeenCalled()

    current.value = user
    await nextTick()
    expect(posthog.identify).toHaveBeenCalledWith('u-1', { username: 'bob', role: 'LISTENER' })

    current.value = null
    await nextTick()
    expect(posthog.reset).toHaveBeenCalledTimes(1)
    stop()
  })
})
