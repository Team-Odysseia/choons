import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import AllAlbumsView from '../AllAlbumsView.vue'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAlbums = vi.fn().mockResolvedValue([])

vi.mock('@/api/albums', () => ({
  getAlbumsPage: (...args: unknown[]) => mockGetAlbums(...args),
  getAlbum: vi.fn(),
  albumImageUrl: vi.fn((id: string) => `/media/images/albums/${id}`),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

const artist = { id: 'a-1', name: 'Test Artist', bio: null, createdAt: daysAgo(60), avatarUrl: null }

function makeAlbum(id: string, title: string, daysOld: number) {
  return { id, title, artist, releaseYear: 2024, createdAt: daysAgo(daysOld), coverUrl: null }
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library/albums', component: AllAlbumsView },
      { path: '/library/albums/:id', component: { template: '<div />' } },
    ],
  })

  const wrapper = mount(AllAlbumsView, {
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }], router] },
  })

  return { wrapper, router, queryClient }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetAlbums.mockResolvedValue([])
  })

  it('shows "All Albums" heading', () => {
    const { wrapper } = mountView()
    expect(wrapper.text()).toContain('All Albums')
  })

  it('shows empty state when no albums', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('No albums yet')
    expect(wrapper.find('[data-code]').text()).toBe('NO ALBUMS')
  })

  it('shows loading state while fetching', () => {
    mockGetAlbums.mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountView()
    expect(wrapper.text()).toContain('Loading')
  })

  it('renders album title and artist name', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Great Album', 5)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Great Album')
    expect(wrapper.text()).toContain('Test Artist')
  })

  it('album cover image has alt text', async () => {
    const album = { ...makeAlbum('al-1', 'Great Album', 5), coverUrl: '/cover.jpg' }
    mockGetAlbums.mockResolvedValue([album])
    const { wrapper } = mountView()
    await flushPromises()
    const img = wrapper.find('img')
    expect(img.attributes('alt')).toBeDefined()
    expect(img.attributes('alt')).not.toBe('')
  })
})

describe('paging', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('requests newest albums first and loads more on demand', async () => {
    const page = (offset: number, count: number) =>
      Array.from({ length: count }, (_, i) => makeAlbum(`al-${offset + i}`, `Album ${offset + i}`, 30))
    mockGetAlbums.mockResolvedValueOnce(page(0, 100)).mockResolvedValueOnce(page(100, 1))
    const { wrapper } = mountView()
    await flushPromises()

    expect(mockGetAlbums).toHaveBeenCalledWith({ page: 0, size: 100, query: '', sort: 'recent' })
    await wrapper.find('[data-testid="more-albums"]').trigger('click')
    await flushPromises()

    expect(mockGetAlbums).toHaveBeenLastCalledWith({ page: 1, size: 100, query: '', sort: 'recent' })
    expect(wrapper.text()).toContain('Album 100')
    expect(wrapper.find('[data-testid="more-albums"]').exists()).toBe(false)
  })
})

// ─── NEW badge ────────────────────────────────────────────────────────────────

describe('NEW badge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows NEW badge for album added 1 day ago', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Fresh', 1)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('NEW')
  })

  it('shows NEW badge for album added exactly 13 days ago', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Recent', 13)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('NEW')
  })

  it('does not show NEW badge for album added 15 days ago', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Old', 15)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).not.toContain('NEW')
  })

  it('shows NEW badge only on qualifying albums when list is mixed', async () => {
    mockGetAlbums.mockResolvedValue([
      makeAlbum('al-1', 'New Album', 7),
      makeAlbum('al-2', 'Old Album', 30),
    ])
    const { wrapper } = mountView()
    await flushPromises()
    const badges = wrapper.findAll('span').filter((s) => s.text() === 'NEW')
    expect(badges).toHaveLength(1)
  })
})

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('navigation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('clicking an album navigates to its detail page', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-99', 'Click Me', 5)])
    const { wrapper, router } = mountView()
    await flushPromises()
    const card = wrapper.find('[data-testid="album-grid"] a')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums/al-99')
  })
})
