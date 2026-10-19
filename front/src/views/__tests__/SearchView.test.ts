import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import SearchView from '../SearchView.vue'

const mockPush = vi.fn()
const mockReplace = vi.fn()
const routeQuery = ref<Record<string, string>>({})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useRoute: () => ({ query: routeQuery.value }),
}))

const mockGetPublicPlaylists = vi.fn()
const mockSearchTracks = vi.fn()
const mockSearchAlbums = vi.fn()
const mockSearchArtists = vi.fn()

vi.mock('@/api/playlists', () => ({
  getPublicPlaylists: (signal?: AbortSignal) => mockGetPublicPlaylists(signal),
}))

vi.mock('@/api/tracks', () => ({
  searchTracks: (query: string, opts?: any) => mockSearchTracks(query, opts),
}))

vi.mock('@/api/albums', () => ({
  searchAlbums: (query: string, opts?: any) => mockSearchAlbums(query, opts),
  albumImageUrl: (id: string) => `/img/album/${id}`,
}))

vi.mock('@/api/artists', () => ({
  searchArtists: (query: string, page?: number, size?: number, signal?: AbortSignal) =>
    mockSearchArtists(query, page, size, signal),
  artistImageUrl: (id: string) => `/img/artist/${id}`,
}))

const stubs = { RouterLink: { props: ['to'], template: '<a :href="String(to)"><slot /></a>' } }

describe('SearchView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.value = {}
    mockGetPublicPlaylists.mockResolvedValue([])
    mockSearchTracks.mockResolvedValue([])
    mockSearchAlbums.mockResolvedValue([])
    mockSearchArtists.mockResolvedValue([])
  })

  it('abortController cancela requisicoes anteriores em novas buscas', async () => {
    const wrapper = mount(SearchView)
    await nextTick()

    const signals: AbortSignal[] = []
    mockSearchTracks.mockImplementation((_query: string, opts?: any) => {
      signals.push(opts?.signal)
      return new Promise((resolve) => setTimeout(() => resolve([]), 50))
    })
    mockSearchAlbums.mockResolvedValue([])
    mockSearchArtists.mockResolvedValue([])
    mockGetPublicPlaylists.mockResolvedValue([])

    // Primeira busca
    await (wrapper.vm as any).runSearch('rock')
    expect(signals.length).toBe(1)
    expect(signals[0]!.aborted).toBe(false)

    // Nova busca - deve abortar a primeira
    await (wrapper.vm as any).runSearch('jazz')
    expect(signals.length).toBe(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('shows the standby plate before typing', async () => {
    const wrapper = mount(SearchView, { global: { stubs } })
    await nextTick()
    expect(wrapper.text()).toContain('Start typing to search across playlists, songs, albums, and artists.')
    expect(wrapper.find('[data-code]').text()).toBe('STANDBY')
  })

  it('shows the no signal plate when nothing matches', async () => {
    routeQuery.value = { q: 'zzz' }
    const wrapper = mount(SearchView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('No results found.')
    expect(wrapper.find('[data-code]').text()).toBe('NO SIGNAL')
  })

  it('shows a hits readout summing all sections', async () => {
    routeQuery.value = { q: 'night' }
    mockSearchAlbums.mockResolvedValue([
      { id: 'al-1', title: 'Night', artist: { id: 'a', name: 'A', bio: null, createdAt: '', avatarUrl: null }, releaseYear: 2000, createdAt: '', coverUrl: null },
    ])
    mockSearchArtists.mockResolvedValue([{ id: 'a', name: 'Night Owl', bio: null, createdAt: '', avatarUrl: null }])
    const wrapper = mount(SearchView, { global: { stubs } })
    await flushPromises()
    expect(wrapper.find('[data-testid="hits-readout"]').text()).toContain('2')
  })
})
