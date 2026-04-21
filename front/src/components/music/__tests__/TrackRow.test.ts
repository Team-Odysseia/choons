import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TrackRow from '../TrackRow.vue'
import { usePlayerStore } from '@/stores/player'

vi.mock('@/api/tracks', () => ({
  streamUrl: vi.fn((id: string) => `http://test/stream/${id}`),
}))

const artist = { id: 'a-1', name: 'Test Artist', bio: '', createdAt: '', avatarUrl: null }
const album = { id: 'al-1', title: 'Test Album', artist: { id: 'a-1', name: 'Test Artist', bio: '', createdAt: '', avatarUrl: null }, releaseYear: 2024, createdAt: '', coverUrl: null }

const mockTrack = {
  id: 't-1',
  title: 'Song One',
  album,
  artist,
  trackNumber: 1,
  durationSeconds: 180,
  createdAt: '',
  hifi: false,
  lrclibId: null,
}

function mountRow(track = mockTrack, index = 0) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(TrackRow, {
    props: { track, queue: [mockTrack], index, showAddToQueue: true, showAddToPlaylist: true },
    global: {
      plugins: [pinia],
      stubs: {
        Play: { template: '<svg />' },
        Plus: { template: '<svg />' },
        ListPlus: { template: '<svg />' },
        Heart: { template: '<svg />' },
      },
    },
  })

  return { wrapper, player: usePlayerStore() }
}

describe('TrackRow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isActive reacts to currentTrack changes (computed, not function)', async () => {
    const { wrapper, player } = mountRow()

    // Initially no active track
    expect(wrapper.find('.text-sm.font-medium').classes()).not.toContain('text-primary')

    // Set current track
    player.currentTrack = mockTrack
    await wrapper.vm.$nextTick()

    // Now should be active
    expect(wrapper.find('.text-sm.font-medium').classes()).toContain('text-primary')

    // Change to different track
    player.currentTrack = { ...mockTrack, id: 't-2' }
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.text-sm.font-medium').classes()).not.toContain('text-primary')
  })
})
