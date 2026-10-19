import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePartyStore } from '@/stores/party'
import { usePlayerStore } from '@/stores/player'
import { httpError } from '@/test-utils/http'
import { makePlaylist, makeTrack } from '@/test-utils/fixtures'
import PlaylistDetailView from '../PlaylistDetailView.vue'

const api = vi.hoisted(() => ({
  getPlaylist: vi.fn(),
  removeTrackFromPlaylist: vi.fn(),
  setPlaylistVisibility: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/api/playlists', () => api)
vi.mock('@/api/favorites', () => ({ checkFavorites: vi.fn().mockResolvedValue([]) }))
vi.mock('@/api/tracks', () => ({ streamUrl: (id: string) => `http://test/stream/${id}`, recordStream: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: toastMock }))

const tracks = [makeTrack({ id: 't-1', title: 'Archangel' }), makeTrack({ id: 't-2', title: 'Near Dark' })]

async function mountView(path = '/playlists/pl-1') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/playlists/:id', component: PlaylistDetailView }],
  })
  await router.push(path)
  const wrapper = mount(PlaylistDetailView, {
    global: {
      plugins: [router],
      stubs: { TrackRow: { props: ['track'], template: '<div class="row">{{ track.title }}</div>' } },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(label))
}

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().user = { id: 'u-1', username: 'bob', role: 'LISTENER' }
  api.getPlaylist.mockResolvedValue(makePlaylist({ tracks }))
})

describe('PlaylistDetailView', () => {
  it('renders the playlist and its tracks', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('h1').text()).toBe('Night bus')
    expect(wrapper.findAll('.row').map((r) => r.text())).toEqual(['Archangel', 'Near Dark'])
    expect(wrapper.text()).toContain('Private')
  })

  it('explains when the playlist cannot be opened', async () => {
    api.getPlaylist.mockRejectedValue(httpError(403, 'Access denied'))
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Access denied')
    expect(wrapper.text()).not.toContain('Loading')
  })

  it('reloads when navigating to another playlist', async () => {
    const { wrapper, router } = await mountView()
    api.getPlaylist.mockResolvedValue(makePlaylist({ id: 'pl-2', name: 'Gym', tracks: [] }))

    await router.push('/playlists/pl-2')
    await flushPromises()

    expect(api.getPlaylist).toHaveBeenLastCalledWith('pl-2')
    expect(wrapper.find('h1').text()).toBe('Gym')
  })

  it('plays all tracks', async () => {
    const { wrapper } = await mountView()
    const player = usePlayerStore()
    const playQueue = vi.spyOn(player, 'playQueue').mockImplementation(() => {})

    await button(wrapper, 'Play all')!.trigger('click')

    expect(playQueue).toHaveBeenCalledWith(tracks)
  })

  it('adds everything to the party queue instead of playing in a party', async () => {
    const { wrapper } = await mountView()
    const party = usePartyStore()
    party.setCurrentUserId('u-1')
    party.state = {
      id: 'p-1',
      revision: 1,
      inviteCode: 'ABCD2345',
      name: 'Party',
      queuePolicy: 'EVERYONE',
      hostUserId: 'u-host',
      members: [{ userId: 'u-1', username: 'bob', host: false, dj: false, connected: true }],
      queue: [],
      playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
    }
    const addTracks = vi.spyOn(party, 'addTracks').mockResolvedValue(true)
    await wrapper.vm.$nextTick()

    expect(button(wrapper, 'Play all')).toBeUndefined()
    await button(wrapper, 'Add to party queue')!.trigger('click')

    expect(addTracks).toHaveBeenCalledWith(tracks)
  })

  it('lets the owner remove tracks and toggle visibility', async () => {
    api.removeTrackFromPlaylist.mockResolvedValue(makePlaylist({ tracks: [tracks[1]!] }))
    api.setPlaylistVisibility.mockResolvedValue(makePlaylist({ tracks: [tracks[1]!], isPublic: true }))
    const { wrapper } = await mountView()

    await wrapper.find('button[title="Remove"]').trigger('click')
    await flushPromises()
    await button(wrapper, 'Make public')!.trigger('click')
    await flushPromises()

    expect(api.removeTrackFromPlaylist).toHaveBeenCalledWith('pl-1', 't-1')
    expect(api.setPlaylistVisibility).toHaveBeenCalledWith('pl-1', true)
    expect(wrapper.text()).toContain('Public')
    expect(wrapper.findAll('.row')).toHaveLength(1)
  })

  it('reports a failed removal', async () => {
    api.removeTrackFromPlaylist.mockRejectedValue(httpError(500))
    const { wrapper } = await mountView()

    await wrapper.find('button[title="Remove"]').trigger('click')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('Failed to remove track')
  })

  it('hides owner controls from other users', async () => {
    api.getPlaylist.mockResolvedValue(makePlaylist({ ownerId: 'someone-else', isPublic: true, tracks }))
    const { wrapper } = await mountView()
    expect(wrapper.find('button[title="Remove"]').exists()).toBe(false)
    expect(button(wrapper, 'Make private')).toBeUndefined()
  })
})
