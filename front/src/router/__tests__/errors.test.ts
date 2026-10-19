import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import router from '../index'

const captureException = vi.hoisted(() => vi.fn())
vi.mock('@/lib/telemetry', () => ({ captureException }))
vi.mock('@/api/auth', () => ({ login: vi.fn(), logout: vi.fn(), me: vi.fn().mockResolvedValue(null) }))

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('router error reporting', () => {
  it('captures failed lazy route loads', async () => {
    const failure = new Error('Failed to fetch dynamically imported module')
    router.addRoute({ path: '/broken', component: () => Promise.reject(failure), meta: { public: true } })

    await expect(router.push('/broken')).rejects.toBe(failure)

    expect(captureException).toHaveBeenCalledWith(failure, { kind: 'router', to: '/broken' })
  })
})
