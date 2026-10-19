import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { PartyStateResponse } from '@/api/types'
import QueuePanel from '../QueuePanel.vue'

vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: ['list', 'itemKey', 'handle', 'disabled'],
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
    const rows = wrapper.findAll('[data-testid="queue-item"]')
    expect(rows[1]!.attributes('data-current')).toBeDefined()
    expect(rows[0]!.attributes('data-current')).toBeUndefined()
  })

  it('calls removeFromQueue when remove button is clicked', async () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1'), makeTrack('2')]
    player.currentIndex = 0
    const removeSpy = vi.spyOn(player, 'removeFromQueue')

    const wrapper = mount(QueuePanel)
    await wrapper.findAll('button[title="Remove"]')[0]!.trigger('click')
    expect(removeSpy).toHaveBeenCalledWith(0)
  })

  it('calls clearQueue when Clear button is clicked', async () => {
    const player = usePlayerStore()
    player.queue = [makeTrack('1')]
    player.currentIndex = 0
    const clearSpy = vi.spyOn(player, 'clearQueue')

    const wrapper = mount(QueuePanel)
    const clearBtn = wrapper.findAll('button').find((b) => b.text().includes('Clear'))
    await clearBtn!.trigger('click')
    expect(clearSpy).toHaveBeenCalled()
  })
})

describe('QueuePanel in a party', () => {
  function partyState(): PartyStateResponse {
    const item = (id: string, trackId: string, position: number) => ({
      id,
      position,
      track: makeTrack(trackId),
      addedByUserId: 'u-host',
      addedByUsername: 'host',
    })
    return {
      id: 'p-1',
      revision: 1,
      inviteCode: 'ABC123',
      name: 'Party',
      queuePolicy: 'DJ_ONLY',
      hostUserId: 'u-host',
      members: [
        { userId: 'u-host', username: 'host', host: true, dj: true, connected: true },
        { userId: 'u-member', username: 'member', host: false, dj: false, connected: true },
      ],
      queue: [item('item-a', '1', 0), item('item-b', '2', 1), item('item-a2', '1', 2)],
      playback: { track: makeTrack('1'), queueItemId: 'item-a2', playing: true, anchorPositionSec: 0, anchorEpochMs: 0 },
    }
  }

  function mountInParty(userId: string) {
    setActivePinia(createPinia())
    const party = usePartyStore()
    party.setCurrentUserId(userId)
    party.state = partyState()
    return { wrapper: mount(QueuePanel), party }
  }

  it('renders party items including duplicates and who added them', () => {
    const { wrapper } = mountInParty('u-host')
    const rows = wrapper.findAll('[data-testid="party-queue-item"]')
    expect(rows).toHaveLength(3)
    expect(wrapper.text()).toContain('added by host')
    expect(wrapper.text()).not.toContain('Clear')
  })

  it('highlights the playing item, not the first duplicate', () => {
    const { wrapper } = mountInParty('u-host')
    const rows = wrapper.findAll('[data-testid="party-queue-item"]')
    expect(rows[2]!.attributes('data-current')).toBeDefined()
    expect(rows[0]!.attributes('data-current')).toBeUndefined()
  })

  it('sends the dragged order when reordering', async () => {
    const { wrapper, party } = mountInParty('u-host')
    const reorder = vi.spyOn(party, 'reorderQueueByIds').mockResolvedValue(true)
    const draggable = wrapper.findComponent({ name: 'draggable' })
    const list = draggable.props('list') as PartyStateResponse['queue']
    list.unshift(list.splice(2, 1)[0]!)

    draggable.vm.$emit('change', {})

    expect(reorder).toHaveBeenCalledWith(['item-a2', 'item-a', 'item-b'])
  })

  it('removes by queue item id', async () => {
    const { wrapper, party } = mountInParty('u-host')
    const remove = vi.spyOn(party, 'removeQueueItem').mockResolvedValue(true)

    await wrapper.findAll('button[title="Remove"]')[2]!.trigger('click')

    expect(remove).toHaveBeenCalledWith('item-a2')
  })

  it('hides queue controls from members without DJ rights', () => {
    const { wrapper } = mountInParty('u-member')
    expect(wrapper.findAll('button[title="Remove"]')).toHaveLength(0)
    expect(wrapper.findComponent({ name: 'draggable' }).props('disabled')).toBe(true)
  })

  it('non-controller sees lock note and no remove buttons', () => {
    const { wrapper } = mountInParty('u-member')
    expect(wrapper.find('[data-testid="queue-lock-note"]').exists()).toBe(true)
    expect(wrapper.findAll('button[title="Remove"]')).toHaveLength(0)
  })

  it('controller does not see the lock note', () => {
    const { wrapper } = mountInParty('u-host')
    expect(wrapper.find('[data-testid="queue-lock-note"]').exists()).toBe(false)
  })
})
