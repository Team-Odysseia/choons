import axios, { isAxiosError, isCancel, type InternalAxiosRequestConfig } from 'axios'
import { isAbortError } from '@/lib/errors'
import { SLOW_REQUEST_MS, trackEvent, tracingHeaders } from '@/lib/telemetry'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    startedAt?: number
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
})

function requestInfo(config: InternalAxiosRequestConfig | undefined) {
  const duration = config?.startedAt === undefined ? undefined : Math.round(performance.now() - config.startedAt)
  return { method: config?.method?.toUpperCase(), url: config?.url, duration_ms: duration }
}

client.interceptors.request.use((config) => {
  config.startedAt = performance.now()
  for (const [name, value] of Object.entries(tracingHeaders())) {
    config.headers.set(name, value)
  }
  return config
})

client.interceptors.response.use(
  (response) => {
    const info = requestInfo(response.config)
    if (info.duration_ms !== undefined && info.duration_ms > SLOW_REQUEST_MS) {
      trackEvent('api_request_slow', {
        source: 'client',
        ...info,
        status: response.status,
        request_id: response.headers['x-request-id'],
      })
    }
    return response
  },
  (error) => {
    if (isAxiosError(error) && !error.response && !isCancel(error) && !isAbortError(error)) {
      trackEvent('api_request_network_error', { ...requestInfo(error.config), code: error.code, message: error.message })
    }
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url ?? '')
      const isAuthProbe = requestUrl.includes('/auth/me')
      const isLoginRoute = window.location.pathname === '/login'

      if (!isAuthProbe && !isLoginRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default client
