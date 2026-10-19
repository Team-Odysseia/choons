import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { usePartyStore } from '@/stores/party'
import type { PartyStateResponse } from '@/api/types'
import { httpError } from '@/test-utils/http'
import PartiesView from '../PartiesView.vue'

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: toastMock }))

function partyState(): PartyStateResponse {
  return {
    id: 'p-1',
    revision: 1,
    inviteCode: 'ABCD2345',
    name: 'Friday',
    queuePolicy: 'DJ_ONLY',
    hostUserId: 'u-host',
    members: [{ userId: 'u-host', username: 'host', host: true, dj: true, connected: true }],
    queue: [],
    playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
  }
}

function mountView() {
  const wrapper = mount(PartiesView)
  return { wrapper, party: usePartyStore() }
}

beforeEach(() => {
  setActivePinia(createPinia())
  Object.values(toastMock).forEach((fn) => fn.mockReset())
})

describe('PartiesView', () => {
  it('creates a party with the trimmed name and chosen policy', async () => {
    const { wrapper, party } = mountView()
    const create = vi.spyOn(party, 'create').mockResolvedValue(undefined)

    await wrapper.find('#party-name').setValue('  Friday  ')
    await wrapper.find('select').setValue('EVERYONE')
    await wrapper.findAll('form')[0]!.trigger('submit')
    await flushPromises()

    expect(create).toHaveBeenCalledWith('Friday', 'EVERYONE')
    expect((wrapper.find('#party-name').element as HTMLInputElement).value).toBe('')
  })

  it('keeps the name when creation fails', async () => {
    const { wrapper, party } = mountView()
    vi.spyOn(party, 'create').mockRejectedValue(httpError(400, 'Party name is required'))

    await wrapper.find('#party-name').setValue('Friday')
    await wrapper.findAll('form')[0]!.trigger('submit')
    await flushPromises()

    expect((wrapper.find('#party-name').element as HTMLInputElement).value).toBe('Friday')
  })

  it('joins with an upper-cased invite code', async () => {
    const { wrapper, party } = mountView()
    const join = vi.spyOn(party, 'join').mockResolvedValue(undefined)

    await wrapper.find('#invite-code').setValue(' abcd2345 ')
    await wrapper.findAll('form')[1]!.trigger('submit')
    await flushPromises()

    expect(join).toHaveBeenCalledWith('ABCD2345')
  })

  it('shows the active party and lets the host end it', async () => {
    const { wrapper, party } = mountView()
    party.setCurrentUserId('u-host')
    party.state = partyState()
    const end = vi.spyOn(party, 'end').mockResolvedValue(undefined)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="invite-readout"]').text()).toContain('ABCD2345')
    expect(wrapper.find('[data-testid="active-party"]').text()).toContain('Live')
    await wrapper.findAll('button').find((b) => b.text() === 'End party')!.trigger('click')
    await flushPromises()

    expect(end).toHaveBeenCalled()
    expect(toastMock.success).toHaveBeenCalledWith('Party ended')
  })

  it('reports a failed leave', async () => {
    const { wrapper, party } = mountView()
    party.setCurrentUserId('u-guest')
    party.state = partyState()
    vi.spyOn(party, 'leave').mockRejectedValue(httpError(500, 'boom'))
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button').find((b) => b.text() === 'Leave party')!.trigger('click')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('boom')
  })

  it('hides the active party panel when not in a party', () => {
    const wrapper = mount(PartiesView)
    expect(wrapper.find('[data-testid="active-party"]').exists()).toBe(false)
  })
})
