import { isAxiosError } from 'axios'

export function apiStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<{ error?: unknown }>(error)) return fallback
  const message = error.response?.data?.error
  return typeof message === 'string' && message.trim() ? message : fallback
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
}
