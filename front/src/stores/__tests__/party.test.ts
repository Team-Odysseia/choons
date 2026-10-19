import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { AxiosError } from 'axios'
import { httpError } from '@/test-utils/http'
import { usePartyStore } from '../party'
import { emitter } from '@/lib/emitter'
import type { PartyStateResponse } from '@/api/types'

const api = vi.hoisted(() => ({
  getMyParty: vi.fn(),
  getPartyState: vi.fn(),
  createParty: vi.fn(),
  joinParty: vi.fn(),
  leaveParty: vi.fn(),
  endParty: vi.fn(),
  kickPartyMember: vi.fn(),
  setPartyMemberDj: vi.fn(),
  addPartyQueueTrack: vi.fn(),
  addPartyQueueTracks: vi.fn(),
  removePartyQueueTrack: vi.fn(),
  reorderPartyQueue: vi.fn(),
  partyPlay: vi.fn(),
  partyPause: vi.fn(),
  partySeek: vi.fn(),
  partyNext: vi.fn(),
  partyPrev: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))

vi.mock('@/api/parties', () => api)
vi.mock('vue-sonner', () => ({ toast: toastMock }))

const mockGetMyParty = api.getMyParty

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  private listeners: Record<string, Array<(event: MessageEvent<string>) => void>> = {}

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }

  addEventListener(name: string, fn: (event: MessageEvent<string>) => void) {
    ;(this.listeners[name] ??= []).push(fn)
  }

  close() {
    this.closed = true
  }

  emit(name: string, data: unknown) {
    const event = new MessageEvent<string>(name, { data: JSON.stringify(data) })
    ;(this.listeners[name] ?? []).forEach((fn) => fn(event))
  }

  static latest() {
    return FakeEventSource.instances[FakeEventSource.instances.length - 1]!
  }
}

vi.stubGlobal('EventSource', FakeEventSource)


function makePartyState(overrides?: Partial<PartyStateResponse>): PartyStateResponse {
  return {
    id: 'p-1',
    revision: 1,
    inviteCode: 'ABC123',
    name: 'Test Party',
    queuePolicy: 'DJ_ONLY' as const,
    hostUserId: 'u-host',
    members: [
      { userId: 'u-host', username: 'host', host: true, dj: false, connected: true },
      { userId: 'u-dj', username: 'dj', host: false, dj: true, connected: true },
      { userId: 'u-member', username: 'member', host: false, dj: false, connected: true },
    ],
    queue: [],
    playback: { track: null, queueItemId: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
    ...overrides,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

async function joinedStore(state = makePartyState()) {
  const party = usePartyStore()
  party.setCurrentUserId('u-host')
  api.joinParty.mockResolvedValueOnce(state)
  await party.join(state.inviteCode)
  return party
}

beforeEach(() => {
  setActivePinia(createPinia())
  emitter.all.clear()
  Object.values(api).forEach((fn) => fn.mockReset())
  Object.values(toastMock).forEach((fn) => fn.mockReset())
  FakeEventSource.instances = []
  mockGetMyParty.mockRejectedValue(new Error('no party'))
})

afterEach(() => {
  usePartyStore().stopPolling()
})

describe('currentUserId wiring', () => {
  it('sets currentUserId when auth:login is emitted', () => {
    const party = usePartyStore()
    expect(party.canControl).toBe(false)

    emitter.emit('auth:login', { userId: 'u-host' })

    expect(party.currentUserId).toBe('u-host')
  })

  it('clears currentUserId when auth:logout is emitted', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-host')
    expect(party.currentUserId).toBe('u-host')

    emitter.emit('auth:logout')

    expect(party.currentUserId).toBeNull()
  })
})

describe('canControl', () => {
  it('is true for host when currentUserId is set', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-host')
    party.state = makePartyState()

    expect(party.canControl).toBe(true)
  })

  it('is true for DJ when currentUserId is set', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-dj')
    party.state = makePartyState()

    expect(party.canControl).toBe(true)
  })

  it('is false for regular member in DJ_ONLY party', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-member')
    party.state = makePartyState()

    expect(party.canControl).toBe(false)
  })

  it('is true for regular member in EVERYONE party', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-member')
    party.state = makePartyState({ queuePolicy: 'EVERYONE' })

    expect(party.canControl).toBe(true)
  })

  it('is false when currentUserId is not set', () => {
    const party = usePartyStore()
    party.state = makePartyState()

    expect(party.canControl).toBe(false)
  })

  it('is false when member is disconnected', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-dj')
    party.state = makePartyState({
      members: [
        { userId: 'u-dj', username: 'dj', host: false, dj: true, connected: false },
      ],
    })

    expect(party.canControl).toBe(false)
  })
})

describe('isHost', () => {
  it('is true when currentUserId matches hostUserId', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-host')
    party.state = makePartyState()

    expect(party.isHost).toBe(true)
  })

  it('is false when currentUserId does not match hostUserId', () => {
    const party = usePartyStore()
    party.setCurrentUserId('u-dj')
    party.state = makePartyState()

    expect(party.isHost).toBe(false)
  })

  it('is false when currentUserId is not set', () => {
    const party = usePartyStore()
    party.state = makePartyState()

    expect(party.isHost).toBe(false)
  })
})

describe('state ordering', () => {
  it('drops states older than the current revision', async () => {
    const party = await joinedStore(makePartyState({ revision: 5, name: 'fresh' }))

    FakeEventSource.latest().emit('state', makePartyState({ revision: 4, name: 'stale' }))
    expect(party.state?.name).toBe('fresh')

    FakeEventSource.latest().emit('state', makePartyState({ revision: 6, name: 'newer' }))
    expect(party.state?.name).toBe('newer')
  })

  it('re-applies the same revision so playback can resync', async () => {
    const party = await joinedStore(makePartyState({ revision: 3 }))
    const listener = vi.fn()
    emitter.on('party:stateChanged', listener)

    api.getPartyState.mockResolvedValueOnce(makePartyState({ revision: 3 }))
    await party.refreshState()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('accepts any revision from a different party', async () => {
    const party = await joinedStore(makePartyState({ revision: 9 }))
    api.joinParty.mockResolvedValueOnce(makePartyState({ id: 'p-2', inviteCode: 'NEWPARTY', revision: 1 }))

    await party.join('NEWPARTY')

    expect(party.state?.id).toBe('p-2')
  })

  it('ignores an action response that resolves after leaving', async () => {
    const party = await joinedStore()
    const pending = deferred<PartyStateResponse>()
    api.addPartyQueueTrack.mockReturnValueOnce(pending.promise)
    api.leaveParty.mockResolvedValueOnce(undefined)

    const adding = party.addTrack('t-1')
    await party.leave()
    pending.resolve(makePartyState({ revision: 2 }))
    await adding

    expect(party.state).toBeNull()
  })

  it('ignores a party lookup that resolves after logout', async () => {
    const party = usePartyStore()
    const pending = deferred<PartyStateResponse>()
    mockGetMyParty.mockReturnValueOnce(pending.promise)

    const fetching = party.fetchMyParty()
    emitter.emit('auth:logout')
    pending.resolve(makePartyState())
    await fetching

    expect(party.state).toBeNull()
  })
})

describe('lifecycle', () => {
  it('logout clears the party and closes the stream', async () => {
    const party = await joinedStore()
    const left = vi.fn()
    emitter.on('party:left', left)

    emitter.emit('auth:logout')

    expect(party.state).toBeNull()
    expect(FakeEventSource.latest().closed).toBe(true)
    expect(left).toHaveBeenCalled()
  })

  it('ended event clears the party and tells the user', async () => {
    const party = await joinedStore()

    FakeEventSource.latest().emit('ended', {})

    expect(party.state).toBeNull()
    expect(toastMock.info).toHaveBeenCalledWith('The party ended or you were removed')
  })

  it('reconnects the stream after an error', async () => {
    vi.useFakeTimers()
    try {
      await joinedStore()
      const first = FakeEventSource.latest()

      first.onerror?.()
      expect(first.closed).toBe(true)
      vi.advanceTimersByTime(1000)

      expect(FakeEventSource.instances).toHaveLength(2)
      expect(FakeEventSource.latest().url).toContain('/parties/ABC123/events')
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaving clears local state even when the party is already gone', async () => {
    const party = await joinedStore()
    api.leaveParty.mockRejectedValueOnce(httpError(404, 'Party not found'))

    await party.leave()

    expect(party.state).toBeNull()
  })

  it('leaving keeps the party when the request fails for another reason', async () => {
    const party = await joinedStore()
    api.leaveParty.mockRejectedValueOnce(httpError(500, 'boom'))

    await expect(party.leave()).rejects.toBeInstanceOf(AxiosError)
    expect(party.state).not.toBeNull()
  })
})

describe('controls', () => {
  it('applies the returned state', async () => {
    const party = await joinedStore()
    api.partySeek.mockResolvedValueOnce(makePartyState({ revision: 2, name: 'seeked' }))

    expect(await party.seek(30)).toBe(true)
    expect(api.partySeek).toHaveBeenCalledWith('ABC123', 30)
    expect(party.state?.name).toBe('seeked')
  })

  it('reports failures without rejecting', async () => {
    const party = await joinedStore()
    api.addPartyQueueTrack.mockRejectedValueOnce(httpError(400, 'Track not found: x'))

    await expect(party.addTrack('x')).resolves.toBe(false)
    expect(toastMock.error).toHaveBeenCalledWith('Track not found: x')
  })

  it('refreshes state after a permission error', async () => {
    const party = await joinedStore()
    api.partyNext.mockRejectedValueOnce(httpError(403, 'Only DJs can control queue in this party'))
    api.getPartyState.mockResolvedValueOnce(makePartyState({ revision: 2 }))

    await party.next()

    expect(api.getPartyState).toHaveBeenCalled()
  })

  it('play forwards the queue item', async () => {
    const party = await joinedStore()
    api.partyPlay.mockResolvedValueOnce(makePartyState({ revision: 2 }))

    await party.play('t-1', 12, 'item-2')

    expect(api.partyPlay).toHaveBeenCalledWith('ABC123', 't-1', 12, 'item-2')
  })

  it('auto-advance names the item that just ended', async () => {
    let advance: (() => Promise<void>) | null = null
    emitter.on('party:joined', ({ next }) => {
      advance = next
    })
    await joinedStore(
      makePartyState({ playback: { track: null, queueItemId: 'item-1', playing: true, anchorPositionSec: 0, anchorEpochMs: 0 } }),
    )
    api.partyNext.mockResolvedValueOnce(makePartyState({ revision: 2 }))

    await advance!()

    expect(api.partyNext).toHaveBeenCalledWith('ABC123', 'item-1')
  })

  it('auto-advance does nothing for members without control', async () => {
    let advance: (() => Promise<void>) | null = null
    emitter.on('party:joined', ({ next }) => {
      advance = next
    })
    const party = await joinedStore()
    party.setCurrentUserId('u-member')

    await advance!()

    expect(api.partyNext).not.toHaveBeenCalled()
  })
})
