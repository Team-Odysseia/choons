import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { usePartyStore } from '@/stores/party'
import { usePlayerStore } from '@/stores/player'
import { httpError } from '@/test-utils/http'
import { makeAlbum, makeTrack } from '@/test-utils/fixtures'
import AlbumView from '../AlbumView.vue'

const getAlbum = vi.hoisted(() => vi.fn())
const getTracks = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
vi.mock('@/api/albums', () => ({ getAlbum, albumImageUrl: (id: string) => `/media/images/albums/${id}` }))
vi.mock('@/api/tracks', () => ({ getTracks, streamUrl: (id: string) => `http://test/stream/${id}`, recordStream: vi.fn() }))
vi.mock('@/api/favorites', () => ({ checkFavorites: vi.fn().mockResolvedValue([]) }))
vi.mock('vue-sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }))

const tracks = [makeTrack({ id: 't-1', title: 'Archangel' }), makeTrack({ id: 't-2', title: 'Near Dark', trackNumber: 2 })]

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library/albums/:id', component: AlbumView },
      { path: '/library/artists/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/library/albums/al-1')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(AlbumView, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: {
        TrackRow: { props: ['track'], template: '<div class="row">{{ track.title }}</div>' },
        AddToPlaylistDialog: true,
      },
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
  getAlbum.mockResolvedValue(makeAlbum())
  getTracks.mockResolvedValue(tracks)
})

describe('AlbumView', () => {
  it('renders album details and tracks', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('h1').text()).toBe('Untrue')
    expect(wrapper.text()).toContain('Burial')
    expect(wrapper.findAll('.row').map((r) => r.text())).toEqual(['Archangel', 'Near Dark'])
    expect(getTracks).toHaveBeenCalledWith('al-1')
  })

  it('shows a message when the album does not exist', async () => {
    getAlbum.mockRejectedValue(httpError(404, 'Album not found: al-1'))
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('This album is not available.')
  })

  it('plays the album', async () => {
    const { wrapper } = await mountView()
    const playQueue = vi.spyOn(usePlayerStore(), 'playQueue').mockImplementation(() => {})

    await button(wrapper, 'Play')!.trigger('click')

    expect(playQueue).toHaveBeenCalledWith(tracks)
  })

  it('opens the artist page', async () => {
    const { wrapper, router } = await mountView()
    await wrapper.findAll('button').find((b) => b.text() === 'Burial')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/artists/ar-1')
  })

  it('blocks party members without DJ rights from queueing the album', async () => {
    const { wrapper } = await mountView()
    const party = usePartyStore()
    party.setCurrentUserId('u-guest')
    party.state = {
      id: 'p-1',
      revision: 1,
      inviteCode: 'ABCD2345',
      name: 'Party',
      queuePolicy: 'DJ_ONLY',
      hostUserId: 'u-host',
      members: [{ userId: 'u-guest', username: 'guest', host: false, dj: false, connected: true }],
      queue: [],
      playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
    }
    const addTracks = vi.spyOn(party, 'addTracks')
    await wrapper.vm.$nextTick()

    await button(wrapper, 'party queue')!.trigger('click')

    expect(addTracks).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('Only DJs can add tracks to party queue')
  })
})
