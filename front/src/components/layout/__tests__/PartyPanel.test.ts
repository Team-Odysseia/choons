import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { AxiosError } from 'axios'
import { usePartyStore } from '@/stores/party'
import type { PartyStateResponse } from '@/api/types'
import PartyPanel from '../PartyPanel.vue'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: toastMock }))

function partyState(policy: PartyStateResponse['queuePolicy'] = 'DJ_ONLY'): PartyStateResponse {
  return {
    id: 'p-1',
    revision: 1,
    inviteCode: 'ABC123',
    name: 'Friday',
    queuePolicy: policy,
    hostUserId: 'u-host',
    members: [
      { userId: 'u-host', username: 'host', host: true, dj: true, connected: true },
      { userId: 'u-guest', username: 'guest', host: false, dj: false, connected: true },
    ],
    queue: [],
    playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
  }
}

function mountAs(userId: string, policy: PartyStateResponse['queuePolicy'] = 'DJ_ONLY') {
  const party = usePartyStore()
  party.setCurrentUserId(userId)
  party.state = partyState(policy)
  return { wrapper: mount(PartyPanel), party }
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((b) => b.text() === label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(toastMock).forEach((fn) => fn.mockReset())
})

describe('PartyPanel', () => {
  it('shows the empty state outside a party', () => {
    expect(mount(PartyPanel).text()).toContain('No active party')
  })

  it('shows invite code and member roles', () => {
    const { wrapper } = mountAs('u-guest')
    expect(wrapper.text()).toContain('ABC123')
    expect(wrapper.text()).toContain('Host')
    expect(wrapper.text()).toContain('Member')
    expect(button(wrapper, 'Kick')).toBeUndefined()
    expect(button(wrapper, 'Leave Party')).toBeDefined()
  })

  it('hides DJ toggles when everyone can control', () => {
    const { wrapper } = mountAs('u-host', 'EVERYONE')
    expect(button(wrapper, 'Make DJ')).toBeUndefined()
    expect(button(wrapper, 'Kick')).toBeDefined()
  })

  it('confirms a kick only when it succeeded', async () => {
    const { wrapper, party } = mountAs('u-host')
    const kick = vi.spyOn(party, 'kick').mockResolvedValueOnce(true).mockResolvedValueOnce(false)

    await button(wrapper, 'Kick')!.trigger('click')
    await button(wrapper, 'Kick')!.trigger('click')
    await Promise.resolve()

    expect(kick).toHaveBeenCalledWith('u-guest')
    expect(toastMock.success).toHaveBeenCalledTimes(1)
    expect(toastMock.success).toHaveBeenCalledWith('Member kicked')
  })

  it('toggles DJ rights', async () => {
    const { wrapper, party } = mountAs('u-host')
    const setDj = vi.spyOn(party, 'setDj').mockResolvedValue(true)

    await button(wrapper, 'Make DJ')!.trigger('click')
    await Promise.resolve()

    expect(setDj).toHaveBeenCalledWith('u-guest', true)
    expect(toastMock.success).toHaveBeenCalledWith('DJ enabled')
  })

  it('host ends the party', async () => {
    const { wrapper, party } = mountAs('u-host')
    const end = vi.spyOn(party, 'end').mockResolvedValue(undefined)

    await button(wrapper, 'End Party')!.trigger('click')
    await Promise.resolve()

    expect(end).toHaveBeenCalled()
    expect(toastMock.success).toHaveBeenCalledWith('Party ended')
  })

  it('reports a failed leave', async () => {
    const { wrapper, party } = mountAs('u-guest')
    vi.spyOn(party, 'leave').mockRejectedValue(new AxiosError('network'))

    await button(wrapper, 'Leave Party')!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve))

    expect(toastMock.error).toHaveBeenCalledWith('Failed to update party state')
  })
})
