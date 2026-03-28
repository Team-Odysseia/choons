import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlaylistsStore } from '../playlists'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetPlaylists = vi.fn()
const mockGetPlaylist = vi.fn()
const mockCreatePlaylist = vi.fn()
const mockDeletePlaylist = vi.fn()
const mockAddTrackToPlaylist = vi.fn()
const mockRemoveTrackFromPlaylist = vi.fn()
const mockReorderPlaylist = vi.fn()
const mockSetPlaylistVisibility = vi.fn()
const mockGetPublicPlaylists = vi.fn()

vi.mock('@/api/playlists', () => ({
  getPlaylists: () => mockGetPlaylists(),
  getPlaylist: (id: string) => mockGetPlaylist(id),
  createPlaylist: (name: string) => mockCreatePlaylist(name),
  deletePlaylist: (id: string) => mockDeletePlaylist(id),
  addTrackToPlaylist: (pid: string, tid: string) => mockAddTrackToPlaylist(pid, tid),
  removeTrackFromPlaylist: (pid: string, tid: string) => mockRemoveTrackFromPlaylist(pid, tid),
  reorderPlaylist: (pid: string, ids: string[]) => mockReorderPlaylist(pid, ids),
  setPlaylistVisibility: (pid: string, isPublic: boolean) => mockSetPlaylistVisibility(pid, isPublic),
  getPublicPlaylists: () => mockGetPublicPlaylists(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeSummary = (overrides = {}) => ({
  id: 'pl-1',
  name: 'My Playlist',
  trackCount: 2,
  isPublic: false,
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
})

const makePlaylist = (overrides = {}) => ({
  id: 'pl-1',
  name: 'My Playlist',
  ownerId: 'user-1',
  tracks: [],
  isPublic: false,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('usePlaylistsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('fetchMyPlaylists', () => {
    it('populates playlists from API', async () => {
      const summaries = [makeSummary(), makeSummary({ id: 'pl-2', name: 'Other' })]
      mockGetPlaylists.mockResolvedValue(summaries)

      const store = usePlaylistsStore()
      await store.fetchMyPlaylists()

      expect(store.playlists).toEqual(summaries)
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchPublicPlaylists', () => {
    it('populates publicPlaylists from API', async () => {
      const summaries = [makeSummary({ id: 'pl-99', isPublic: true })]
      mockGetPublicPlaylists.mockResolvedValue(summaries)

      const store = usePlaylistsStore()
      await store.fetchPublicPlaylists()

      expect(store.publicPlaylists).toEqual(summaries)
    })
  })

  describe('setVisibility', () => {
    it('calls API and updates current and summary', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary()]
      const updated = makePlaylist({ isPublic: true })
      mockSetPlaylistVisibility.mockResolvedValue(updated)

      await store.setVisibility('pl-1', true)

      expect(mockSetPlaylistVisibility).toHaveBeenCalledWith('pl-1', true)
      expect(store.current?.isPublic).toBe(true)
      expect(store.playlists[0].isPublic).toBe(true)
    })

    it('can make a playlist private', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary({ isPublic: true })]
      const updated = makePlaylist({ isPublic: false })
      mockSetPlaylistVisibility.mockResolvedValue(updated)

      await store.setVisibility('pl-1', false)

      expect(store.current?.isPublic).toBe(false)
      expect(store.playlists[0].isPublic).toBe(false)
    })
  })
})
