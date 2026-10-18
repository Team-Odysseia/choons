import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFavoritesStore } from '../favorites'

const mockGetFavorites = vi.fn()
const mockAddFavorite = vi.fn()
const mockRemoveFavorite = vi.fn()
const mockCheckFavorites = vi.fn()
const mockToastError = vi.fn()

vi.mock('@/api/favorites', () => ({
  getFavorites: () => mockGetFavorites(),
  addFavorite: (trackId: string) => mockAddFavorite(trackId),
  removeFavorite: (trackId: string) => mockRemoveFavorite(trackId),
  checkFavorites: (trackIds: string[]) => mockCheckFavorites(trackIds),
}))

vi.mock('vue-sonner', () => ({
  toast: {
    error: (message: string) => mockToastError(message),
  },
}))

const makeTrack = (id: string) => ({
  id,
  title: `Track ${id}`,
  album: {
    id: 'album-1',
    title: 'Album',
    artist: { id: 'artist-1', name: 'Artist', bio: '', createdAt: '', avatarUrl: null },
    releaseYear: 2024,
    createdAt: '',
    coverUrl: null,
  },
  artist: { id: 'artist-1', name: 'Artist', bio: '', createdAt: '', avatarUrl: null },
  trackNumber: 1,
  durationSeconds: 180,
  createdAt: '',
  hifi: false,
  lrclibId: null,
})

describe('useFavoritesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchFavorites populates tracks and favoriteIds', async () => {
    const first = makeTrack('track-1')
    const second = makeTrack('track-2')
    mockGetFavorites.mockResolvedValue([
      { track: first, favoritedAt: '2025-01-01T00:00:00Z' },
      { track: second, favoritedAt: '2025-01-02T00:00:00Z' },
    ])

    const store = useFavoritesStore()
    await store.fetchFavorites()

    expect(store.tracks).toEqual([first, second])
    expect(store.isFavorited('track-1')).toBe(true)
    expect(store.isFavorited('track-2')).toBe(true)
    expect(store.loading).toBe(false)
  })

  it('fetchStatus replaces status for passed trackIds only', async () => {
    const store = useFavoritesStore()
    store.favoriteIds = new Set(['track-1', 'track-2', 'track-9'])
    mockCheckFavorites.mockResolvedValue(['track-2'])

    await store.fetchStatus(['track-1', 'track-2'])

    expect([...store.favoriteIds].sort()).toEqual(['track-2', 'track-9'])
  })

  it('toggle adds favorite optimistically and keeps it on success', async () => {
    const store = useFavoritesStore()
    mockAddFavorite.mockResolvedValue(makeTrack('track-1'))

    await store.toggle('track-1')

    expect(mockAddFavorite).toHaveBeenCalledWith('track-1')
    expect(store.isFavorited('track-1')).toBe(true)
  })

  it('toggle removes favorite optimistically and keeps removal on success', async () => {
    const store = useFavoritesStore()
    store.favoriteIds = new Set(['track-1'])
    store.tracks = [makeTrack('track-1')]
    mockRemoveFavorite.mockResolvedValue(undefined)

    await store.toggle('track-1')

    expect(mockRemoveFavorite).toHaveBeenCalledWith('track-1')
    expect(store.isFavorited('track-1')).toBe(false)
    expect(store.tracks).toEqual([])
  })

  it('toggle rolls back and shows toast when add fails', async () => {
    const store = useFavoritesStore()
    mockAddFavorite.mockRejectedValue(new Error('boom'))

    await store.toggle('track-1')

    expect(store.isFavorited('track-1')).toBe(false)
    expect(mockToastError).toHaveBeenCalledWith('Failed to add favorite')
  })
})
