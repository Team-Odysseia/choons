import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'
import { useAuthStore } from '@/stores/auth'

// @ts-ignore
globalThis.__APP_VERSION__ = 'test'

const mockListAllAlbumRequests = vi.fn()

vi.mock('@/api/albumRequests', () => ({
  listAllAlbumRequests: () => mockListAllAlbumRequests(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/', name: 'library', query: {} }),
}))

describe('AppSidebar polling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockListAllAlbumRequests.mockResolvedValue([])
    vi.useFakeTimers()
  })

  it('pausa polling quando aba fica oculta', async () => {
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      configurable: true,
      value: 'visible',
    })

    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore()
    auth.user = { id: 'u-1', username: 'admin', role: 'ADMIN' }

    mount(AppSidebar, {
      global: {
        plugins: [pinia],
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    vi.advanceTimersByTime(30000)
    // onMounted chama refreshUnseenRequests + interval depois de 30s
    expect(mockListAllAlbumRequests).toHaveBeenCalledTimes(2)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))

    vi.advanceTimersByTime(60000)
    // Nao deve chamar de novo enquanto oculto
    expect(mockListAllAlbumRequests).toHaveBeenCalledTimes(2)
  })
})
