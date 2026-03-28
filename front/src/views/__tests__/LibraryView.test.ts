import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LibraryView from '../LibraryView.vue'
import { useMusicStore } from '@/stores/music'
import { usePlaylistsStore } from '@/stores/playlists'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/api/albums', () => ({ getAlbums: vi.fn().mockResolvedValue([]), getAlbum: vi.fn() }))
vi.mock('@/api/artists', () => ({ getArtists: vi.fn().mockResolvedValue([]), getArtist: vi.fn() }))
vi.mock('@/api/tracks', () => ({
  getTracks: vi.fn().mockResolvedValue([]),
  getMostPlayedTracks: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/api/playlists', () => ({
  getPlaylists: vi.fn().mockResolvedValue([]),
  createPlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  getPlaylist: vi.fn(),
  addTrackToPlaylist: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  reorderPlaylist: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

const artist = { id: 'a-1', name: 'Test Artist', bio: null, createdAt: daysAgo(60) }

function makeAlbum(id: string, title: string, daysOld: number) {
  return { id, title, artist, releaseYear: 2024, createdAt: daysAgo(daysOld), coverUrl: null }
}

function makeTrack(id: string, title: string) {
  return {
    id, title,
    album: makeAlbum('al-1', 'Album', 10),
    artist,
    trackNumber: 1, durationSeconds: 180,
    createdAt: daysAgo(5), hifi: false, lrclibId: null,
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library', component: LibraryView },
      { path: '/library/albums', component: { template: '<div />' } },
      { path: '/library/albums/:id', component: { template: '<div />' } },
      { path: '/playlists', component: { template: '<div />' } },
    ],
  })
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  // Stub store actions so onMounted does not overwrite patched state
  const music = useMusicStore()
  music.fetchArtists = vi.fn().mockResolvedValue(undefined)
  music.fetchRecentAlbums = vi.fn().mockResolvedValue(undefined)
  music.fetchMostPlayed = vi.fn().mockResolvedValue(undefined)
  const playlists = usePlaylistsStore()
  playlists.fetchMyPlaylists = vi.fn().mockResolvedValue(undefined)

  const router = makeRouter()
  const wrapper = mount(LibraryView, {
    global: { plugins: [pinia, router] },
  })

  return { wrapper, router, music, playlists }
}

// ─── Recently Added Albums swiper ────────────────────────────────────────────

describe('recently added albums swiper', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render swiper when recentAlbums is empty', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find('.swiper-track').exists()).toBe(false)
  })

  it('renders album cards when recentAlbums has items', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Album One', 3)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.swiper-track').exists()).toBe(true)
    expect(wrapper.text()).toContain('Album One')
    expect(wrapper.text()).toContain('Test Artist')
  })

  it('renders "See all albums" button', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Album One', 3)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('See all albums')
  })

  it('"See all albums" navigates to /library/albums', async () => {
    const { wrapper, router, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Album One', 3)] })
    await wrapper.vm.$nextTick()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('See all albums'))
    await btn!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums')
  })

  it('shows NEW badge for albums added within 14 days', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'New Album', 7)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('NEW')
  })

  it('does not show NEW badge for albums older than 14 days', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Old Album', 30)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('NEW')
  })

  it('clicking an album card navigates to the album detail page', async () => {
    const { wrapper, router, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-42', 'Nav Album', 3)] })
    await wrapper.vm.$nextTick()
    const card = wrapper.find('.swiper-track > div')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums/al-42')
  })

  it('renders scroll left and right buttons', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Album', 3)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="Scroll left"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Scroll right"]').exists()).toBe(true)
  })

  it('renders the section heading "Recently Added"', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ recentAlbums: [makeAlbum('al-1', 'Album', 3)] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Recently Added')
  })
})

// ─── Most Played section ──────────────────────────────────────────────────────

describe('most played section', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render when mostPlayedTracks is empty', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Most Played')
  })

  it('renders section heading when there are most played tracks', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ mostPlayedTracks: [makeTrack('t-1', 'Top Song')] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Most Played')
  })

  it('renders track titles', async () => {
    const { wrapper, music } = mountView()
    music.$patch({ mostPlayedTracks: [makeTrack('t-1', 'Top Song'), makeTrack('t-2', 'Second Song')] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Top Song')
    expect(wrapper.text()).toContain('Second Song')
  })
})
