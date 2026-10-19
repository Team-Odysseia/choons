import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RightDrawer from '../RightDrawer.vue'
import { useDrawerStore } from '@/stores/drawer'
import { usePartyStore } from '@/stores/party'
import type { PartyStateResponse } from '@/api/types'

vi.mock('@/api/tracks', () => ({ streamUrl: vi.fn((id: string) => `http://test/stream/${id}`) }))

const stubs = { QueuePanel: true, LyricsPanel: true, PartyPanel: true }
let wrapper: VueWrapper | undefined

function partyState(): PartyStateResponse {
  return {
    id: 'p-1',
    revision: 1,
    inviteCode: 'ABC123',
    name: 'Party',
    queuePolicy: 'DJ_ONLY',
    hostUserId: 'u-1',
    members: [],
    queue: [],
    playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
  }
}

async function mountDrawer() {
  wrapper = mount(RightDrawer, { global: { stubs }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

function tab(name: string) {
  return [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')].find((t) => t.textContent?.includes(name))
}

describe('RightDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('renders nothing when no panel is open', async () => {
    await mountDrawer()
    expect(document.body.querySelector('[role="tablist"]')).toBeNull()
  })

  it('ArrowRight moves to next tab', async () => {
    const drawer = useDrawerStore()
    drawer.activePanel = 'queue'
    await mountDrawer()
    const queue = tab('Queue')!
    queue.focus()
    queue.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await flushPromises()
    expect(drawer.activePanel).toBe('lyrics')
  })

  it('party tab hidden when not in party', async () => {
    useDrawerStore().activePanel = 'queue'
    await mountDrawer()
    expect(tab('Party')).toBeUndefined()
  })

  it('party tab shown when in a party', async () => {
    usePartyStore().state = partyState()
    useDrawerStore().activePanel = 'queue'
    await mountDrawer()
    expect(tab('Party')).toBeDefined()
  })

  it('close key closes the drawer', async () => {
    const drawer = useDrawerStore()
    drawer.activePanel = 'lyrics'
    await mountDrawer()
    document.body.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')!.click()
    expect(drawer.activePanel).toBeNull()
  })
})
