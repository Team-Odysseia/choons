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
      expect(store.playlists[0]!.isPublic).toBe(true)
    })

    it('can make a playlist private', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary({ isPublic: true })]
      const updated = makePlaylist({ isPublic: false })
      mockSetPlaylistVisibility.mockResolvedValue(updated)

      await store.setVisibility('pl-1', false)

      expect(store.current?.isPublic).toBe(false)
      expect(store.playlists[0]!.isPublic).toBe(false)
    })
  })

  describe('summary ordering', () => {
    it('moves an edited playlist to the top like the server does', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary({ id: 'pl-0', name: 'Top' }), makeSummary({ trackCount: 0 })]
      mockAddTrackToPlaylist.mockResolvedValue(
        makePlaylist({ tracks: [{ id: 't-1' }], updatedAt: '2024-02-01T00:00:00' }),
      )

      await store.addTrack('pl-1', 't-1')

      expect(store.playlists.map((p) => p.id)).toEqual(['pl-1', 'pl-0'])
      expect(store.playlists[0]).toMatchObject({ trackCount: 1, updatedAt: '2024-02-01T00:00:00' })
    })

    it('syncs the summary after a reorder', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary({ id: 'pl-0' }), makeSummary()]
      mockReorderPlaylist.mockResolvedValue(makePlaylist({ updatedAt: '2024-03-01T00:00:00' }))

      await store.reorder('pl-1', ['t-2', 't-1'])

      expect(store.playlists[0]).toMatchObject({ id: 'pl-1', updatedAt: '2024-03-01T00:00:00' })
    })

    it('ignores playlists that are not in the summary list', async () => {
      const store = usePlaylistsStore()
      store.playlists = [makeSummary({ id: 'pl-0' })]
      mockRemoveTrackFromPlaylist.mockResolvedValue(makePlaylist({ id: 'someone-elses' }))

      await store.removeTrack('someone-elses', 't-1')

      expect(store.playlists.map((p) => p.id)).toEqual(['pl-0'])
    })
  })
})
