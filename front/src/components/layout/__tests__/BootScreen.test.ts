import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mockReducedMotion } from '@/test-utils/matchMedia'
import { useAuthStore } from '@/stores/auth'

const FLAG = 'choons:booted'

async function mountBoot(options: { reduce?: boolean; loggedIn?: boolean } = {}) {
  vi.resetModules()
  mockReducedMotion(options.reduce ?? false)
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  if (options.loggedIn !== false) auth.user = { id: 'u-1', username: 'paulo', role: 'LISTENER' }
  const { default: BootScreen } = await import('../BootScreen.vue')
  return mount(BootScreen, { global: { plugins: [pinia] } })
}

describe('BootScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shows the all-segments-lit frame first', async () => {
    const wrapper = await mountBoot()
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('88:88 888')
  })

  it('renders nothing when already booted this session', async () => {
    sessionStorage.setItem(FLAG, '1')
    const wrapper = await mountBoot()
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(false)
  })

  it('renders nothing with reduced motion', async () => {
    const wrapper = await mountBoot({ reduce: true })
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(false)
  })

  it('renders nothing when logged out', async () => {
    const wrapper = await mountBoot({ loggedIn: false })
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(false)
  })

  it('sets session flag after finishing', async () => {
    const wrapper = await mountBoot()
    await vi.advanceTimersByTimeAsync(1200)
    expect(sessionStorage.getItem(FLAG)).toBe('1')
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(false)
  })

  it('types the wordmark before READY', async () => {
    const wrapper = await mountBoot()
    await vi.advanceTimersByTimeAsync(400)
    expect(wrapper.text()).toMatch(/^C|CH|CHO/)
    await vi.advanceTimersByTimeAsync(300)
    expect(wrapper.text()).toContain('READY')
  })

  it('starts when the user logs in after mount', async () => {
    const wrapper = await mountBoot({ loggedIn: false })
    useAuthStore().user = { id: 'u-1', username: 'paulo', role: 'LISTENER' }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="boot-screen"]').exists()).toBe(true)
  })
})
