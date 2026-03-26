import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from '../LoginView.vue'
import { useAuthStore } from '@/stores/auth'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockToastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  Toaster: { template: '<div />' },
  toast: { error: mockToastError, success: vi.fn() },
}))

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  me: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/library', component: { template: '<div/>' } },
    ],
  })
}

function mountLogin() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()

  const wrapper = mount(LoginView, {
    global: { plugins: [pinia, router] },
  })

  return { wrapper, router, auth: useAuthStore() }
}

// ─── Renderização ─────────────────────────────────────────────────────────────

describe('renderização', () => {
  it('exibe campo username', () => {
    const { wrapper } = mountLogin()
    expect(wrapper.find('#username').exists()).toBe(true)
  })

  it('exibe campo password do tipo password', () => {
    const { wrapper } = mountLogin()
    const input = wrapper.find('#password')
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('password')
  })

  it('exibe botão Sign in habilitado por padrão', () => {
    const { wrapper } = mountLogin()
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
    expect(btn.text()).toBe('Sign in')
  })

  it('exibe "Signing in…" e desabilita botão quando loading=true', async () => {
    const { wrapper, auth } = mountLogin()
    auth.$patch({ loading: true })
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.text()).toBe('Signing in…')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})

// ─── Submit ───────────────────────────────────────────────────────────────────

describe('submit', () => {
  it('chama auth.login com username e password preenchidos', async () => {
    const { wrapper, auth } = mountLogin()
    auth.login = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('#username').setValue('admin')
    await wrapper.find('#password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(auth.login).toHaveBeenCalledWith('admin', 'secret')
  })

  it('redireciona para /library após login bem-sucedido', async () => {
    const { wrapper, router, auth } = mountLogin()
    auth.login = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('#username').setValue('admin')
    await wrapper.find('#password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/library')
  })

  it('exibe toast de credenciais inválidas em erro 401', async () => {
    const { wrapper, auth } = mountLogin()
    auth.login = vi.fn().mockRejectedValue({ response: { status: 401 } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Invalid username or password')
  })

  it('exibe toast genérico em outros erros', async () => {
    const { wrapper, auth } = mountLogin()
    auth.login = vi.fn().mockRejectedValue({ response: { status: 500 } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Login failed. Please try again.')
  })

  it('não redireciona quando login falha', async () => {
    const { wrapper, router, auth } = mountLogin()
    auth.login = vi.fn().mockRejectedValue({ response: { status: 401 } })

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.path).not.toBe('/library')
  })
})
