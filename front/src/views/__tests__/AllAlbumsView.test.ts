import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AllAlbumsView from '../AllAlbumsView.vue'
import { useMusicStore } from '@/stores/music'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/api/albums', () => ({ getAlbums: vi.fn().mockResolvedValue([]), getAlbum: vi.fn() }))
vi.mock('@/api/artists', () => ({ getArtists: vi.fn().mockResolvedValue([]), getArtist: vi.fn() }))
vi.mock('@/api/tracks', () => ({ getTracks: vi.fn().mockResolvedValue([]) }))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

const artist = { id: 'a-1', name: 'Test Artist', bio: null, createdAt: daysAgo(60) }

function makeAlbum(id: string, title: string, daysOld: number) {
  return { id, title, artist, releaseYear: 2024, createdAt: daysAgo(daysOld) }
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  // Stub fetchAllAlbums so onMounted does not overwrite patched state
  const music = useMusicStore()
  music.fetchAllAlbums = vi.fn().mockResolvedValue(undefined)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library/albums', component: AllAlbumsView },
      { path: '/library/albums/:id', component: { template: '<div />' } },
    ],
  })

  const wrapper = mount(AllAlbumsView, {
    global: { plugins: [pinia, router] },
  })

  return { wrapper, router, music }
}

// ─── Renderização ─────────────────────────────────────────────────────────────

describe('renderização', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows "All Albums" heading', () => {
    const { wrapper } = mountView()
    expect(wrapper.text()).toContain('All Albums')
  })

  it('shows empty state when no albums and not loading', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ allAlbums: [], loading: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('No albums yet')
  })

  it('shows loading state', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ loading: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading')
  })

  it('renders album title and artist name', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ allAlbums: [makeAlbum('al-1', 'Great Album', 5)], loading: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Great Album')
    expect(wrapper.text()).toContain('Test Artist')
  })

  it('calls fetchAllAlbums on mount', async () => {
    const { music } = mountView()
    await flushPromises()
    expect(music.fetchAllAlbums).toHaveBeenCalledOnce()
  })
})

// ─── NEW badge ────────────────────────────────────────────────────────────────

describe('NEW badge', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows NEW badge for album added 1 day ago', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ allAlbums: [makeAlbum('al-1', 'Fresh', 1)], loading: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('NEW')
  })

  it('shows NEW badge for album added exactly 13 days ago', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ allAlbums: [makeAlbum('al-1', 'Recent', 13)], loading: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('NEW')
  })

  it('does not show NEW badge for album added 15 days ago', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ allAlbums: [makeAlbum('al-1', 'Old', 15)], loading: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('NEW')
  })

  it('shows NEW badge only on qualifying albums when list is mixed', async () => {
    const { wrapper, music } = mountView()
    music.$patch({
      allAlbums: [
        makeAlbum('al-1', 'New Album', 7),
        makeAlbum('al-2', 'Old Album', 30),
      ],
      loading: false,
    })
    await wrapper.vm.$nextTick()
    const badges = wrapper.findAll('span').filter((s) => s.text() === 'NEW')
    expect(badges).toHaveLength(1)
  })

  it('does not show NEW badge when no albums are within 14 days', async () => {
    const { wrapper, music } = mountView()
    music.$patch({
      allAlbums: [makeAlbum('al-1', 'Older', 20), makeAlbum('al-2', 'Much Older', 90)],
      loading: false,
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('NEW')
  })
})

// ─── Navegação ────────────────────────────────────────────────────────────────

describe('navegação', () => {
  it('clicking an album navigates to its detail page', async () => {
    const { wrapper, router, music } = mountView()
    music.$patch({ allAlbums: [makeAlbum('al-99', 'Click Me', 5)], loading: false })
    await wrapper.vm.$nextTick()
    const card = wrapper.find('[class*="bg-card"]')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums/al-99')
  })
})
