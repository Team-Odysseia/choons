import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import QueuePanel from '../QueuePanel.vue'

vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: ['list', 'itemKey', 'handle'],
    emits: ['change'],
    template: `<div><template v-for="(item, index) in list" :key="index"><slot name="item" :element="item" :index="index" /></template></div>`,
  },
}))

const makeTrack = (id: string) => ({
  id,
  title: `Track ${id}`,
  artist: { id: 'a1', name: 'Artist', bio: null, createdAt: '', avatarUrl: null },
  album: { id: 'al1', title: 'Album', artist: { id: 'a1', name: 'Artist', bio: null, createdAt: '', avatarUrl: null }, releaseYear: 2024, createdAt: '', coverUrl: null },
  trackNumber: 1,
  durationSeconds: 180,
  createdAt: '',
  hifi: false,
  lrclibId: null,
})

describe('QueuePanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows empty state when queue is empty', () => {
    const wrapper = mount(QueuePanel)
    expect(wrapper.text()).toContain('Queue is empty')
  })

  it('renders tracks in the queue', () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1'), makeTrack('2')]
    player.currentIndex = 0

    const wrapper = mount(QueuePanel)
    expect(wrapper.text()).toContain('Track 1')
    expect(wrapper.text()).toContain('Track 2')
    expect(wrapper.text()).toContain('2 tracks')
  })

  it('highlights the current track', () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1'), makeTrack('2')]
    player.currentIndex = 1

    const wrapper = mount(QueuePanel)
    const rows = wrapper.findAll('.flex.items-center.gap-2')
    expect(rows[1].classes()).toContain('bg-muted')
    expect(rows[0].classes()).not.toContain('bg-muted')
  })

  it('calls removeFromQueue when remove button is clicked', async () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1'), makeTrack('2')]
    player.currentIndex = 0
    const removeSpy = vi.spyOn(player, 'removeFromQueue')

    const wrapper = mount(QueuePanel)
    await wrapper.findAll('button[title="Remove"]')[0].trigger('click')
    expect(removeSpy).toHaveBeenCalledWith(0)
  })

  it('calls clearQueue when Clear button is clicked', async () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1')]
    player.currentIndex = 0
    const clearSpy = vi.spyOn(player, 'clearQueue')

    const wrapper = mount(QueuePanel)
    await wrapper.find('button', { text: 'Clear' } as any).trigger('click')
    expect(clearSpy).toHaveBeenCalled()
  })
})
