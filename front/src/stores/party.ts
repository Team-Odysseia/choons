import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import {
  addPartyQueueTrack,
  addPartyQueueTracks,
  createParty,
  endParty,
  getMyParty,
  getPartyState,
  joinParty,
  kickPartyMember,
  leaveParty,
  partyNext,
  partyPause,
  partyPlay,
  partyPrev,
  partySeek,
  removePartyQueueTrack,
  reorderPartyQueue,
  setPartyMemberDj,
} from '@/api/parties'
import type { PartyQueuePolicy, PartyStateResponse, TrackResponse } from '@/api/types'
import { emitter } from '@/lib/emitter'
import { apiErrorMessage, apiStatus } from '@/lib/errors'
import { useDrawerStore } from './drawer'

export const usePartyStore = defineStore('party', () => {
  const state = ref<PartyStateResponse | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelayMs = 1000
  const currentUserId = ref<string | null>(null)

  const POLL_INTERVAL_MS = 12000
  const RECONNECT_MAX_DELAY_MS = 15000

  const inParty = computed(() => !!state.value)
  const inviteCode = computed(() => state.value?.inviteCode ?? null)
  const isHost = computed(() => !!state.value && currentUserId.value === state.value.hostUserId)
  const canControl = computed(() => {
    if (!state.value || !currentUserId.value) return false
    const member = state.value.members.find((m) => m.userId === currentUserId.value)
    if (!member || !member.connected) return false
    if (member.host) return true
    if (state.value.queuePolicy === 'EVERYONE') return true
    return member.dj
  })

  let epoch = 0
  let leaving = false

  emitter.on('auth:login', (payload) => {
    setCurrentUserId(payload.userId)
    void fetchMyParty()
  })

  emitter.on('auth:logout', () => {
    setCurrentUserId(null)
    applyState(null)
    stopPolling()
  })

  function isOutdated(next: PartyStateResponse) {
    const current = state.value
    return !!current && current.id === next.id && next.revision < current.revision
  }

  function applyState(next: PartyStateResponse | null) {
    if (next && isOutdated(next)) return
    const wasInParty = !!state.value
    if (!next || state.value?.id !== next.id) epoch++
    state.value = next

    if (!next) {
      clearPolling()
      stopRealtime()
      if (!wasInParty) return
      const drawer = useDrawerStore()
      if (drawer.activePanel === 'party') {
        drawer.close()
      }
      emitter.emit('party:left')
      emitter.emit('party:stateChanged', null)
      return
    }

    if (!wasInParty) {
      emitter.emit('party:joined', { next: advanceAfterTrackEnded })
    }
    emitter.emit('party:stateChanged', next)
  }

  async function advanceAfterTrackEnded() {
    if (!state.value || !canControl.value) return
    const ended = state.value.playback.queueItemId
    await control('Failed to advance party queue', (code) => partyNext(code, ended))
  }

  function enter(party: PartyStateResponse) {
    applyState(party)
    startPolling()
    startRealtime()
  }

  async function control(
    fallback: string,
    request: (inviteCode: string) => Promise<PartyStateResponse>,
  ): Promise<boolean> {
    if (!state.value) return false
    const startedIn = epoch
    try {
      const next = await request(state.value.inviteCode)
      if (startedIn === epoch) applyState(next)
      return true
    } catch (error) {
      if (startedIn !== epoch) return false
      toast.error(apiErrorMessage(error, fallback))
      const status = apiStatus(error)
      if (status === 403 || status === 404) void refreshState()
      return false
    }
  }

  async function fetchMyParty() {
    const startedIn = epoch
    try {
      const party = await getMyParty()
      if (startedIn === epoch) enter(party)
    } catch {
      if (startedIn === epoch) applyState(null)
    }
  }

  async function create(name: string, queuePolicy: PartyQueuePolicy) {
    loading.value = true
    try {
      enter(await createParty(name, queuePolicy))
      toast.success('Party created')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Failed to create party'))
      throw e
    } finally {
      loading.value = false
    }
  }

  async function join(code: string) {
    loading.value = true
    try {
      const party = await joinParty(code)
      enter(party)
      toast.success(`Joined party ${party.name}`)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Failed to join party'))
      throw e
    } finally {
      loading.value = false
    }
  }

  async function refreshState() {
    if (!state.value || syncing.value) return
    const startedIn = epoch
    syncing.value = true
    try {
      const next = await getPartyState(state.value.inviteCode)
      if (startedIn === epoch) applyState(next)
    } catch (e) {
      const status = apiStatus(e)
      if (startedIn === epoch && (status === 404 || status === 403)) applyState(null)
    } finally {
      syncing.value = false
    }
  }

  async function exit(request: (inviteCode: string) => Promise<unknown>) {
    if (!state.value) return
    leaving = true
    try {
      await request(state.value.inviteCode)
    } catch (e) {
      const status = apiStatus(e)
      if (status !== 404 && status !== 403) throw e
    } finally {
      leaving = false
    }
    applyState(null)
  }

  const leave = () => exit(leaveParty)
  const end = () => exit(endParty)

  const kick = (userId: string) =>
    control('Failed to kick member', (code) => kickPartyMember(code, userId))

  const setDj = (userId: string, dj: boolean) =>
    control('Failed to update DJ', (code) => setPartyMemberDj(code, userId, dj))

  const addTrack = (trackId: string) =>
    control('Failed to add track to party queue', (code) => addPartyQueueTrack(code, trackId))

  async function addTracks(tracks: TrackResponse[]) {
    if (tracks.length === 0) return false
    return control('Failed to add tracks to party queue', (code) =>
      addPartyQueueTracks(code, tracks.map((track) => track.id)),
    )
  }

  const removeQueueItem = (itemId: string) =>
    control('Failed to remove queue item', (code) => removePartyQueueTrack(code, itemId))

  const reorderQueueByIds = (orderedItemIds: string[]) =>
    control('Failed to reorder party queue', (code) => reorderPartyQueue(code, orderedItemIds))

  const play = (trackId: string, positionSec: number, queueItemId?: string | null) =>
    control('Failed to start playback', (code) => partyPlay(code, trackId, positionSec, queueItemId))

  const pause = (positionSec: number) =>
    control('Failed to pause playback', (code) => partyPause(code, positionSec))

  const seek = (positionSec: number) =>
    control('Failed to seek', (code) => partySeek(code, positionSec))

  const next = () => control('Failed to skip track', (code) => partyNext(code))

  const prev = () => control('Failed to restart track', (code) => partyPrev(code))

  function startPolling() {
    clearPolling()
    pollTimer = setInterval(() => {
      void refreshState()
    }, POLL_INTERVAL_MS)
  }

  function clearPolling() {
    if (!pollTimer) return
    clearInterval(pollTimer)
    pollTimer = null
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) return
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  function stopRealtime() {
    clearReconnectTimer()
    if (!eventSource) return
    eventSource.close()
    eventSource = null
  }

  function scheduleReconnect() {
    if (!state.value || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectRealtime()
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, RECONNECT_MAX_DELAY_MS)
    }, reconnectDelayMs)
  }

  function connectRealtime() {
    if (!state.value) return

    stopRealtime()
    const source = new EventSource(
      `${import.meta.env.VITE_API_URL}/parties/${state.value.inviteCode}/events`,
      { withCredentials: true },
    )
    eventSource = source

    source.onopen = () => {
      reconnectDelayMs = 1000
      clearReconnectTimer()
    }

    source.addEventListener('state', (event) => {
      reconnectDelayMs = 1000
      if (eventSource !== source) return
      const message = event as MessageEvent<string>
      applyState(JSON.parse(message.data) as PartyStateResponse)
    })

    source.addEventListener('ended', () => {
      if (eventSource !== source) return
      if (!leaving) toast.info('The party ended or you were removed')
      applyState(null)
    })

    source.onerror = () => {
      if (eventSource !== source) return
      stopRealtime()
      scheduleReconnect()
    }
  }

  function startRealtime() {
    reconnectDelayMs = 1000
    clearReconnectTimer()
    connectRealtime()
  }

  function stopPolling() {
    clearPolling()
    stopRealtime()
  }

  function setCurrentUserId(userId: string | null) {
    currentUserId.value = userId
  }

  return {
    state,
    loading,
    currentUserId,
    inParty,
    inviteCode,
    isHost,
    canControl,
    fetchMyParty,
    create,
    join,
    refreshState,
    leave,
    end,
    kick,
    setDj,
    addTrack,
    addTracks,
    removeQueueItem,
    reorderQueueByIds,
    play,
    pause,
    seek,
    next,
    prev,
    stopPolling,
    setCurrentUserId,
  }
})
