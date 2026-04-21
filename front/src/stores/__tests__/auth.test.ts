import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { emitter } from '@/lib/emitter'

const mockLogin = vi.fn()
const mockMe = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/api/auth', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  me: () => mockMe(),
  logout: () => mockLogout(),
}))

const adminUser = { id: 'u-1', username: 'admin', role: 'ADMIN' as const }
const listenerUser = { id: 'u-2', username: 'listener', role: 'LISTENER' as const }

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  emitter.all.clear()
  mockLogout.mockReset()
  mockLogout.mockResolvedValue(undefined)
})

// ─── estado inicial ───────────────────────────────────────────────────────────

describe('estado inicial', () => {
  it('isAuthenticated é false quando não há user', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('isAuthenticated é true após fetchMe', async () => {
    mockMe.mockResolvedValueOnce(adminUser)
    const store = useAuthStore()
    await store.fetchMe()
    expect(store.isAuthenticated).toBe(true)
  })

  it('isAdmin é false antes de fetchMe', () => {
    const store = useAuthStore()
    expect(store.isAdmin).toBe(false)
  })
})

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('sucesso: popula user após login', async () => {
    const loginListener = vi.fn()
    emitter.on('auth:login', loginListener)

    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(adminUser)

    const store = useAuthStore()
    await store.login('admin', 'pass')

    expect(store.user).toEqual(adminUser)
    expect(store.isAuthenticated).toBe(true)
    expect(loginListener).toHaveBeenCalledWith({ userId: adminUser.id })
  })

  it('sucesso: loading volta a false após completar', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(adminUser)

    const store = useAuthStore()
    await store.login('admin', 'pass')

    expect(store.loading).toBe(false)
  })

  it('erro: não autentica e loading volta a false', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'))

    const store = useAuthStore()
    await expect(store.login('admin', 'wrong')).rejects.toThrow()

    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
  })
})

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout', () => {
  it('limpa user e emite logout', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(adminUser)

    const store = useAuthStore()
    await store.login('admin', 'pass')

    await store.logout()

    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('emite auth:logout ao fazer logout', async () => {
    const logoutListener = vi.fn()
    emitter.on('auth:logout', logoutListener)

    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(adminUser)

    const store = useAuthStore()
    await store.login('admin', 'pass')
    await store.logout()

    expect(logoutListener).toHaveBeenCalledOnce()
  })
})

// ─── fetchMe ──────────────────────────────────────────────────────────────────

describe('fetchMe', () => {
  it('popula user com os dados da API', async () => {
    mockMe.mockResolvedValueOnce(listenerUser)

    const store = useAuthStore()
    await store.fetchMe()

    expect(store.user).toEqual(listenerUser)
  })

  it('consulta API mesmo sem estado local', async () => {
    mockMe.mockResolvedValueOnce(listenerUser)
    const store = useAuthStore()
    await store.fetchMe()
    expect(mockMe).toHaveBeenCalled()
  })

  it('em erro da API, chama logout', async () => {
    mockMe.mockRejectedValueOnce(new Error('401'))

    const store = useAuthStore()
    await store.fetchMe()

    expect(store.user).toBeNull()
    expect(mockLogout).toHaveBeenCalledOnce()
  })
})

// ─── isAdmin ──────────────────────────────────────────────────────────────────

describe('isAdmin', () => {
  it('true para usuário com role ADMIN', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(adminUser)

    const store = useAuthStore()
    await store.login('admin', 'pass')

    expect(store.isAdmin).toBe(true)
  })

  it('false para usuário com role LISTENER', async () => {
    mockLogin.mockResolvedValueOnce(undefined)
    mockMe.mockResolvedValueOnce(listenerUser)

    const store = useAuthStore()
    await store.login('listener', 'pass')

    expect(store.isAdmin).toBe(false)
  })
})
