import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMusicStore } from '../music'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetAlbums = vi.fn()
const mockGetArtists = vi.fn()

vi.mock('@/api/albums', () => ({
  getAlbums: (...args: unknown[]) => mockGetAlbums(...args),
  getAlbum: vi.fn(),
}))

vi.mock('@/api/artists', () => ({
  getArtists: () => mockGetArtists(),
  getArtist: vi.fn(),
}))

const mockGetMostPlayedTracks = vi.fn()

vi.mock('@/api/tracks', () => ({
  getTracks: vi.fn().mockResolvedValue([]),
  getMostPlayedTracks: (...args: unknown[]) => mockGetMostPlayedTracks(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const now = Date.now()
const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString()

const artist = { id: 'a-1', name: 'Artist One', bio: null, createdAt: daysAgo(30) }

const albums = [
  { id: 'al-1', title: 'Alpha', artist, releaseYear: 2024, createdAt: daysAgo(1) },
  { id: 'al-2', title: 'Beta', artist, releaseYear: 2023, createdAt: daysAgo(5) },
  { id: 'al-3', title: 'Gamma', artist, releaseYear: 2022, createdAt: daysAgo(20) },
  { id: 'al-4', title: 'Delta', artist, releaseYear: 2021, createdAt: daysAgo(30) },
  { id: 'al-5', title: 'Epsilon', artist, releaseYear: 2020, createdAt: daysAgo(60) },
  { id: 'al-6', title: 'Zeta', artist, releaseYear: 2019, createdAt: daysAgo(90) },
  { id: 'al-7', title: 'Eta', artist, releaseYear: 2018, createdAt: daysAgo(100) },
  { id: 'al-8', title: 'Theta', artist, releaseYear: 2017, createdAt: daysAgo(120) },
  { id: 'al-9', title: 'Iota', artist, releaseYear: 2016, createdAt: daysAgo(150) },
  { id: 'al-10', title: 'Kappa', artist, releaseYear: 2015, createdAt: daysAgo(200) },
  { id: 'al-11', title: 'Lambda', artist, releaseYear: 2014, createdAt: daysAgo(365) },
]

const track = {
  id: 't-1',
  title: 'Top Song',
  album: { id: 'al-1', title: 'Album', artist: { id: 'a-1', name: 'Artist', bio: null, createdAt: '' }, releaseYear: 2024, createdAt: '' },
  artist: { id: 'a-1', name: 'Artist', bio: null, createdAt: '' },
  trackNumber: 1,
  durationSeconds: 180,
  createdAt: '',
  hifi: false,
  lrclibId: null,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

// ─── fetchRecentAlbums ────────────────────────────────────────────────────────

describe('fetchRecentAlbums', () => {
  it('stores at most 10 albums', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchRecentAlbums()
    expect(store.recentAlbums).toHaveLength(10)
  })

  it('sorts albums by createdAt descending', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchRecentAlbums()
    const dates = store.recentAlbums.map((a) => new Date(a.createdAt).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it('first album is the most recently added', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchRecentAlbums()
    expect(store.recentAlbums[0].id).toBe('al-1')
  })

  it('calls getAlbums with no arguments', async () => {
    mockGetAlbums.mockResolvedValueOnce([])
    const store = useMusicStore()
    await store.fetchRecentAlbums()
    expect(mockGetAlbums).toHaveBeenCalledWith()
  })
})

// ─── fetchAllAlbums ───────────────────────────────────────────────────────────

describe('fetchAllAlbums', () => {
  it('stores all albums when fewer than 10', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums.slice(0, 3))
    const store = useMusicStore()
    await store.fetchAllAlbums()
    expect(store.allAlbums).toHaveLength(3)
  })

  it('stores all albums including beyond 10', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchAllAlbums()
    expect(store.allAlbums).toHaveLength(11)
  })

  it('sorts all albums by createdAt descending', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchAllAlbums()
    const dates = store.allAlbums.map((a) => new Date(a.createdAt).getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })

  it('sets loading to false after fetch', async () => {
    mockGetAlbums.mockResolvedValueOnce(albums)
    const store = useMusicStore()
    await store.fetchAllAlbums()
    expect(store.loading).toBe(false)
  })

  it('sets loading to false on error', async () => {
    mockGetAlbums.mockRejectedValueOnce(new Error('network'))
    const store = useMusicStore()
    await expect(store.fetchAllAlbums()).rejects.toThrow()
    expect(store.loading).toBe(false)
  })
})

// ─── fetchMostPlayed ──────────────────────────────────────────────────────────

describe('fetchMostPlayed', () => {
  it('popula mostPlayedTracks com o retorno da API', async () => {
    mockGetMostPlayedTracks.mockResolvedValueOnce([track])
    const store = useMusicStore()
    await store.fetchMostPlayed()
    expect(store.mostPlayedTracks).toEqual([track])
  })

  it('começa com lista vazia e preenche após fetch', async () => {
    mockGetMostPlayedTracks.mockResolvedValueOnce([track])
    const store = useMusicStore()
    expect(store.mostPlayedTracks).toEqual([])
    await store.fetchMostPlayed()
    expect(store.mostPlayedTracks).toHaveLength(1)
  })

  it('chama getMostPlayedTracks da API', async () => {
    mockGetMostPlayedTracks.mockResolvedValueOnce([])
    const store = useMusicStore()
    await store.fetchMostPlayed()
    expect(mockGetMostPlayedTracks).toHaveBeenCalledOnce()
  })
})
