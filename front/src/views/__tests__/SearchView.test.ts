import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
})
