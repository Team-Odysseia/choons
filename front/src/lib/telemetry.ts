import type { PostHog } from 'posthog-js'
import { watch } from 'vue'
import type { UserResponse } from '@/api/types'

export const SLOW_REQUEST_MS = 1000

type Properties = Record<string, unknown>

export interface TelemetryConfig {
  key?: string
  host?: string
  environment: string
  appVersion: string
}

let instance: PostHog | undefined
let loading: Promise<PostHog | undefined> = Promise.resolve(undefined)

export function initTelemetry(config: TelemetryConfig): Promise<boolean> {
  const { key } = config
  if (!key) return Promise.resolve(false)
  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: config.host || 'https://us.i.posthog.com',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        capture_exceptions: true,
        session_recording: { maskAllInputs: true },
      })
      posthog.register({
        service: 'choons-front',
        environment: config.environment,
        app_version: config.appVersion,
      })
      instance = posthog
      return posthog
    })
    .catch((error: unknown) => {
      console.warn('Telemetry disabled: failed to load PostHog', error)
      return undefined
    })
  return loading.then(Boolean)
}

function withPostHog(action: (posthog: PostHog) => void) {
  if (instance) {
    action(instance)
    return
  }
  void loading.then((posthog) => {
    if (posthog) action(posthog)
  })
}

export function captureException(error: unknown, properties?: Properties) {
  withPostHog((posthog) => posthog.captureException(error, properties))
}

export function trackEvent(name: string, properties: Properties) {
  withPostHog((posthog) => posthog.capture(name, properties))
}

export function identifyUser(user: UserResponse) {
  withPostHog((posthog) => posthog.identify(user.id, { username: user.username, role: user.role }))
}

export function resetIdentity() {
  withPostHog((posthog) => posthog.reset())
}

export function tracingHeaders(): Record<string, string> {
  if (!instance) return {}
  return {
    'X-POSTHOG-SESSION-ID': instance.get_session_id(),
    'X-POSTHOG-DISTINCT-ID': instance.get_distinct_id(),
  }
}

export function bindIdentity(user: () => UserResponse | null) {
  return watch(
    user,
    (current, previous) => {
      if (current) identifyUser(current)
      else if (previous) resetIdentity()
    },
    { immediate: true },
  )
}
