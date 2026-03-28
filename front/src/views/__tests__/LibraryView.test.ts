import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import LibraryView from '../LibraryView.vue'
import { usePlaylistsStore } from '@/stores/playlists'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAlbums = vi.fn().mockResolvedValue([])
const mockGetArtists = vi.fn().mockResolvedValue([])
const mockGetMostPlayedTracks = vi.fn().mockResolvedValue([])

vi.mock('@/api/albums', () => ({
  getAlbums: (...args: unknown[]) => mockGetAlbums(...args),
  getAlbum: vi.fn(),
  albumImageUrl: vi.fn((id: string) => `/media/images/albums/${id}`),
}))
vi.mock('@/api/artists', () => ({
  getArtists: () => mockGetArtists(),
  getArtist: vi.fn(),
  artistImageUrl: vi.fn((id: string) => `/media/images/artists/${id}`),
}))
vi.mock('@/api/tracks', () => ({
  getTracks: vi.fn().mockResolvedValue([]),
  getMostPlayedTracks: (...args: unknown[]) => mockGetMostPlayedTracks(...args),
  streamUrl: vi.fn(),
  recordStream: vi.fn(),
}))
vi.mock('@/api/playlists', () => ({
  getPlaylists: vi.fn().mockResolvedValue([]),
  createPlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  getPlaylist: vi.fn(),
  addTrackToPlaylist: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  reorderPlaylist: vi.fn(),
  setPlaylistVisibility: vi.fn(),
  getPublicPlaylists: vi.fn().mockResolvedValue([]),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

const artist = { id: 'a-1', name: 'Test Artist', bio: null, createdAt: daysAgo(60), avatarUrl: null }

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
      { path: '/playlists/:id', component: { template: '<div />' } },
    ],
  })
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const playlists = usePlaylistsStore()
  playlists.fetchMyPlaylists = vi.fn().mockResolvedValue(undefined)
  playlists.fetchPublicPlaylists = vi.fn().mockResolvedValue(undefined)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = makeRouter()

  const wrapper = mount(LibraryView, {
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }], router] },
  })

  return { wrapper, router, playlists, queryClient }
}

// ─── Recently Added Albums swiper ────────────────────────────────────────────

describe('recently added albums swiper', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetAlbums.mockResolvedValue([])
    mockGetArtists.mockResolvedValue([])
    mockGetMostPlayedTracks.mockResolvedValue([])
  })

  it('does not render swiper when no albums', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find('.swiper-track').exists()).toBe(false)
  })

  it('renders album cards when albums are returned', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Album One', 3)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find('.swiper-track').exists()).toBe(true)
    expect(wrapper.text()).toContain('Album One')
    expect(wrapper.text()).toContain('Test Artist')
  })

  it('renders "See all albums" button', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Album One', 3)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('See all albums')
  })

  it('"See all albums" navigates to /library/albums', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Album One', 3)])
    const { wrapper, router } = mountView()
    await flushPromises()
    const btn = wrapper.findAll('button').find((b) => b.text().includes('See all albums'))
    await btn!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums')
  })

  it('shows NEW badge for albums added within 14 days', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'New Album', 7)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('NEW')
  })

  it('does not show NEW badge for albums older than 14 days', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Old Album', 30)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).not.toContain('NEW')
  })

  it('clicking an album card navigates to the album detail page', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-42', 'Nav Album', 3)])
    const { wrapper, router } = mountView()
    await flushPromises()
    const card = wrapper.find('.swiper-track > div')
    await card.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums/al-42')
  })

  it('renders scroll buttons', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Album', 3)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.find('[aria-label="Scroll left"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Scroll right"]').exists()).toBe(true)
  })

  it('renders the section heading "Recently Added"', async () => {
    mockGetAlbums.mockResolvedValue([makeAlbum('al-1', 'Album', 3)])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Recently Added')
  })
})

// ─── Community Playlists section ─────────────────────────────────────────────

describe('community playlists section', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetAlbums.mockResolvedValue([])
    mockGetArtists.mockResolvedValue([])
    mockGetMostPlayedTracks.mockResolvedValue([])
  })

  it('does not render when publicPlaylists is empty', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Community Playlists')
  })

  it('renders section heading when there are public playlists', async () => {
    const { wrapper, playlists } = mountView()
    playlists.$patch({
      publicPlaylists: [{ id: 'pl-1', name: 'Chill Vibes', trackCount: 3, isPublic: true, updatedAt: '2024-01-01' }],
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Community Playlists')
    expect(wrapper.text()).toContain('Chill Vibes')
  })
})

// ─── Most Played section ──────────────────────────────────────────────────────

describe('most played section', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetAlbums.mockResolvedValue([])
    mockGetArtists.mockResolvedValue([])
    mockGetMostPlayedTracks.mockResolvedValue([])
  })

  it('does not render when no most played tracks', async () => {
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Most Played')
  })

  it('renders section heading when there are most played tracks', async () => {
    mockGetMostPlayedTracks.mockResolvedValue([makeTrack('t-1', 'Top Song')])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Most Played')
  })

  it('renders track titles', async () => {
    mockGetMostPlayedTracks.mockResolvedValue([makeTrack('t-1', 'Top Song'), makeTrack('t-2', 'Second Song')])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('Top Song')
    expect(wrapper.text()).toContain('Second Song')
  })
})

// ─── Artists section ─────────────────────────────────────────────────────────

describe('artists section', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGetAlbums.mockResolvedValue([])
    mockGetMostPlayedTracks.mockResolvedValue([])
  })

  it('shows loading state while fetching', async () => {
    mockGetArtists.mockReturnValue(new Promise(() => {}))
    const { wrapper } = mountView()
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows empty state when no artists', async () => {
    mockGetArtists.mockResolvedValue([])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('No artists yet')
  })

  it('renders artist names', async () => {
    mockGetArtists.mockResolvedValue([{ ...artist, id: 'a-1', name: 'The Beatles' }])
    const { wrapper } = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('The Beatles')
  })
})
