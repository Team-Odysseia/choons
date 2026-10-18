import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePartyStore } from '../party'
import { emitter } from '@/lib/emitter'

const mockGetMyParty = vi.fn()
const mockGetPartyState = vi.fn()
const mockCreateParty = vi.fn()

vi.mock('@/api/parties', () => ({
  getMyParty: () => mockGetMyParty(),
  getPartyState: () => mockGetPartyState(),
  createParty: () => mockCreateParty(),
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

function makePartyState(overrides?: Partial<ReturnType<typeof usePartyStore>['state']>) {
  return {
    id: 'p-1',
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
    playback: { track: null, playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  emitter.all.clear()
  mockGetMyParty.mockReset()
  mockGetMyParty.mockRejectedValue(new Error('no party'))
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
