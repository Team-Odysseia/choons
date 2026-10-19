import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'
import { useAuthStore } from '@/stores/auth'

// @ts-ignore
globalThis.__APP_VERSION__ = 'test'

const mockListAllAlbumRequests = vi.fn()

vi.mock('@/api/albumRequests', () => ({
  listAllAlbumRequests: () => mockListAllAlbumRequests(),
}))

const mockRoute = { path: '/', name: 'library', query: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => mockRoute,
}))

const stubs = { RouterLink: { props: ['to'], template: '<a :href="String(to)"><slot /></a>' } }

function mountSidebar(role: 'ADMIN' | 'LISTENER') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.user = { id: 'u-1', username: 'paulo', role }
  return mount(AppSidebar, { global: { plugins: [pinia], stubs } })
}

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

describe('AppSidebar sources', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockListAllAlbumRequests.mockResolvedValue([])
    mockRoute.path = '/'
    mockRoute.name = 'library'
    localStorage.clear()
  })

  it('marks current route source as active', () => {
    mockRoute.path = '/favorites'
    mockRoute.name = 'favorites'
    const wrapper = mountSidebar('LISTENER')
    const active = wrapper.findAll('[data-active]')
    expect(active).toHaveLength(1)
    expect(active[0]!.text()).toContain('Favorites')
  })

  it('shows admin group only for admins', () => {
    expect(mountSidebar('LISTENER').text()).not.toContain('Listeners')
    const admin = mountSidebar('ADMIN')
    expect(admin.text()).toContain('Listeners')
    expect(admin.text()).toContain('Album Requests')
  })

  it('requests badge shows unseen count', async () => {
    localStorage.setItem('admin_album_requests_seen_at', '2020-01-01T00:00:00Z')
    mockListAllAlbumRequests.mockResolvedValue([
      { status: 'PENDING', createdAt: '2026-10-01T00:00:00Z' },
      { status: 'PENDING', createdAt: '2026-10-02T00:00:00Z' },
      { status: 'ACCEPTED', createdAt: '2026-10-03T00:00:00Z' },
    ])
    const wrapper = mountSidebar('ADMIN')
    await flushPromises()
    const requests = wrapper.findAll('a').find((a) => a.text().includes('Album Requests'))
    expect(requests!.text()).toContain('2')
  })

  it('shows the username in a bouncing marquee', () => {
    const wrapper = mountSidebar('LISTENER')
    const user = wrapper.find('[data-testid="sidebar-user"]')
    expect(user.classes()).toContain('vfd-marquee')
    expect(user.text()).toBe('paulo')
  })
})
