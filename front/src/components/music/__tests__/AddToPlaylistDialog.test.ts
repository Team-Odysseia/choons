import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import AddToPlaylistDialog from '../AddToPlaylistDialog.vue'
import { usePlaylistsStore } from '@/stores/playlists'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockToastSuccess = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  Toaster: { template: '<div />' },
  toast: { success: mockToastSuccess, error: vi.fn() },
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

const artist = { id: 'a-1', name: 'Test Artist', bio: null, createdAt: '2024-01-01T00:00:00Z' }
const album = { id: 'al-1', title: 'Test Album', artist, releaseYear: 2024, createdAt: '2024-01-01T00:00:00Z' }

function makeTrack(id: string, title: string) {
  return { id, title, album, artist, trackNumber: 1, durationSeconds: 180, createdAt: '2024-01-01T00:00:00Z' }
}

const track1 = makeTrack('t-1', 'Song One')
const track2 = makeTrack('t-2', 'Song Two')
const track3 = makeTrack('t-3', 'Song Three')

const pl1 = { id: 'p-1', name: 'My Favourites', trackCount: 3, updatedAt: '2024-01-01T00:00:00Z' }
const pl2 = { id: 'p-2', name: 'Rock Mix', trackCount: 10, updatedAt: '2024-01-01T00:00:00Z' }

function mountDialog(tracks = [track1], open = true) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(AddToPlaylistDialog, {
    props: { open, tracks },
    global: {
      plugins: [pinia],
      stubs: { Teleport: true, Transition: true },
    },
  })

  return { wrapper, store: usePlaylistsStore() }
}

// ─── Visibility ───────────────────────────────────────────────────────────────

describe('visibility', () => {
  it('renders when open=true', () => {
    const { wrapper } = mountDialog([track1], true)
    expect(wrapper.text()).toContain('Add to playlist')
  })

  it('does not render content when open=false', () => {
    const { wrapper } = mountDialog([track1], false)
    expect(wrapper.text()).not.toContain('Add to playlist')
  })
})

// ─── Subtitle ─────────────────────────────────────────────────────────────────

describe('subtitle', () => {
  it('shows quoted track title for a single track', () => {
    const { wrapper } = mountDialog([track1])
    expect(wrapper.text()).toContain('"Song One"')
  })

  it('shows track count and album name for multiple tracks', () => {
    const { wrapper } = mountDialog([track1, track2, track3])
    expect(wrapper.text()).toContain('3 tracks')
    expect(wrapper.text()).toContain('"Test Album"')
  })
})

// ─── Existing playlists ───────────────────────────────────────────────────────

describe('existing playlists', () => {
  it('shows empty message when no playlists exist', () => {
    const { wrapper, store } = mountDialog()
    store.$patch({ playlists: [] })
    expect(wrapper.text()).toContain('No playlists yet')
  })

  it('renders playlist names', async () => {
    const { wrapper, store } = mountDialog()
    store.$patch({ playlists: [pl1, pl2] })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('My Favourites')
    expect(wrapper.text()).toContain('Rock Mix')
  })

  it('calls addTrack with the correct playlist and track ids', async () => {
    const { wrapper, store } = mountDialog([track1])
    store.$patch({ playlists: [pl1] })
    store.addTrack = vi.fn().mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('My Favourites'))
    await btn!.trigger('click')
    await flushPromises()

    expect(store.addTrack).toHaveBeenCalledWith('p-1', 't-1')
  })

  it('calls addTrack for every track when adding multiple (album)', async () => {
    const { wrapper, store } = mountDialog([track1, track2, track3])
    store.$patch({ playlists: [pl1] })
    store.addTrack = vi.fn().mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('My Favourites'))
    await btn!.trigger('click')
    await flushPromises()

    expect(store.addTrack).toHaveBeenCalledTimes(3)
    expect(store.addTrack).toHaveBeenCalledWith('p-1', 't-1')
    expect(store.addTrack).toHaveBeenCalledWith('p-1', 't-2')
    expect(store.addTrack).toHaveBeenCalledWith('p-1', 't-3')
  })

  it('shows success toast with playlist name after adding', async () => {
    const { wrapper, store } = mountDialog([track1])
    store.$patch({ playlists: [pl1] })
    store.addTrack = vi.fn().mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('My Favourites'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('My Favourites'))
  })

  it('emits close after adding to an existing playlist', async () => {
    const { wrapper, store } = mountDialog([track1])
    store.$patch({ playlists: [pl1] })
    store.addTrack = vi.fn().mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('My Favourites'))
    await btn!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
  })
})

// ─── Create new playlist ──────────────────────────────────────────────────────

describe('create new playlist', () => {
  it('has a name input and a create button', () => {
    const { wrapper } = mountDialog()
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.findAll('button').some((b) => b.text().includes('Create'))).toBe(true)
  })

  it('Create button is disabled when input is empty', async () => {
    const { wrapper } = mountDialog()
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Create')
    expect(btn!.attributes('disabled')).toBeDefined()
  })

  it('Create button is enabled when input has a value', async () => {
    const { wrapper } = mountDialog()
    await wrapper.find('input').setValue('New Playlist')
    const btn = wrapper.findAll('button').find((b) => b.text() === 'Create')
    expect(btn!.attributes('disabled')).toBeUndefined()
  })

  it('calls createPlaylist then addTrack on submit', async () => {
    const { wrapper, store } = mountDialog([track1])
    const created = { id: 'p-new', name: 'New Playlist', ownerId: 'u-1', tracks: [], createdAt: '', updatedAt: '' }
    store.createPlaylist = vi.fn().mockResolvedValue(created)
    store.addTrack = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('input').setValue('New Playlist')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.createPlaylist).toHaveBeenCalledWith('New Playlist')
    expect(store.addTrack).toHaveBeenCalledWith('p-new', 't-1')
  })

  it('calls addTrack for every track when creating playlist for an album', async () => {
    const { wrapper, store } = mountDialog([track1, track2, track3])
    const created = { id: 'p-new', name: 'Album Set', ownerId: 'u-1', tracks: [], createdAt: '', updatedAt: '' }
    store.createPlaylist = vi.fn().mockResolvedValue(created)
    store.addTrack = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('input').setValue('Album Set')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.addTrack).toHaveBeenCalledTimes(3)
  })

  it('shows success toast after creating playlist', async () => {
    const { wrapper, store } = mountDialog([track1])
    const created = { id: 'p-new', name: 'Fresh List', ownerId: 'u-1', tracks: [], createdAt: '', updatedAt: '' }
    store.createPlaylist = vi.fn().mockResolvedValue(created)
    store.addTrack = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('input').setValue('Fresh List')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('Fresh List'))
  })

  it('clears input and emits close after creating', async () => {
    const { wrapper, store } = mountDialog([track1])
    const created = { id: 'p-new', name: 'Cool Mix', ownerId: 'u-1', tracks: [], createdAt: '', updatedAt: '' }
    store.createPlaylist = vi.fn().mockResolvedValue(created)
    store.addTrack = vi.fn().mockResolvedValue(undefined)

    await wrapper.find('input').setValue('Cool Mix')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeTruthy()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('does not submit when input is only whitespace', async () => {
    const { wrapper, store } = mountDialog([track1])
    store.createPlaylist = vi.fn()

    await wrapper.find('input').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(store.createPlaylist).not.toHaveBeenCalled()
  })
})

// ─── Close ────────────────────────────────────────────────────────────────────

describe('close', () => {
  it('emits close when clicking the × button', async () => {
    const { wrapper } = mountDialog()
    const closeBtn = wrapper.find('[aria-label="Close dialog"]')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })
})
