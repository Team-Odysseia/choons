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
import { useAuthStore } from './auth'
import { usePlayerStore } from './player'
import { useDrawerStore } from './drawer'

export const usePartyStore = defineStore('party', () => {
  const state = ref<PartyStateResponse | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const eventSource = ref<EventSource | null>(null)
  const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayMs = ref(1000)

  const POLL_INTERVAL_MS = 12000
  const RECONNECT_MAX_DELAY_MS = 15000

  const auth = useAuthStore()

  const inParty = computed(() => !!state.value)
  const inviteCode = computed(() => state.value?.inviteCode ?? null)
  const isHost = computed(() => !!state.value && auth.user?.id === state.value.hostUserId)
  const canControl = computed(() => {
    if (!state.value || !auth.user) return false
    const member = state.value.members.find((m) => m.userId === auth.user!.id)
    if (!member || !member.connected) return false
    if (member.host) return true
    if (state.value.queuePolicy === 'EVERYONE') return true
    return member.dj
  })

  function applyState(next: PartyStateResponse | null) {
    const wasInParty = !!state.value
    state.value = next

    if (!next && wasInParty) {
      stopRealtime()
      clearPolling()
      const drawer = useDrawerStore()
      if (drawer.activePanel === 'party') {
        drawer.close()
      }
      usePlayerStore().stop()
      return
    }

    syncPlayerFromState()
  }

  function syncPlayerFromState() {
    const player = usePlayerStore()
    const party = state.value
    if (!party) return

    const queueTracks = party.queue.map((item) => item.track)
    const playbackTrack = party.playback.track
    const now = Date.now()
    const elapsedSec = Math.max(0, (now - party.playback.anchorEpochMs) / 1000)
    const position = party.playback.playing
      ? party.playback.anchorPositionSec + elapsedSec
      : party.playback.anchorPositionSec

    player.syncExternalState(playbackTrack, queueTracks, party.playback.playing, position)
  }

  async function fetchMyParty() {
    try {
      const party = await getMyParty()
      applyState(party)
      startPolling()
      startRealtime()
    } catch {
      applyState(null)
      clearPolling()
      stopRealtime()
    }
  }

  async function create(name: string, queuePolicy: PartyQueuePolicy) {
    loading.value = true
    try {
      const party = await createParty(name, queuePolicy)
      applyState(party)
      startPolling()
      startRealtime()
      toast.success('Party created')
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to create party')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function join(code: string) {
    loading.value = true
    try {
      const party = await joinParty(code)
      applyState(party)
      startPolling()
      startRealtime()
      toast.success(`Joined party ${party.name}`)
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Failed to join party')
      throw e
    } finally {
      loading.value = false
    }
  }

  async function refreshState() {
    if (!state.value || syncing.value) return
    syncing.value = true
    try {
      const next = await getPartyState(state.value.inviteCode)
      applyState(next)
    } catch (e: any) {
      if (e.response?.status === 404 || e.response?.status === 403) {
        applyState(null)
        clearPolling()
        stopRealtime()
      }
    } finally {
      syncing.value = false
    }
  }

  async function leave() {
    if (!state.value) return
    await leaveParty(state.value.inviteCode)
    applyState(null)
    clearPolling()
    stopRealtime()
  }

  async function end() {
    if (!state.value) return
    await endParty(state.value.inviteCode)
    applyState(null)
    clearPolling()
    stopRealtime()
  }

  async function kick(userId: string) {
    if (!state.value) return
    const next = await kickPartyMember(state.value.inviteCode, userId)
    applyState(next)
  }

  async function setDj(userId: string, dj: boolean) {
    if (!state.value) return
    const next = await setPartyMemberDj(state.value.inviteCode, userId, dj)
    applyState(next)
  }

  async function addTrack(trackId: string) {
    if (!state.value) return
    const next = await addPartyQueueTrack(state.value.inviteCode, trackId)
    applyState(next)
  }

  async function addTracks(tracks: TrackResponse[]) {
    if (!state.value || tracks.length === 0) return
    const next = await addPartyQueueTracks(
      state.value.inviteCode,
      tracks.map((track) => track.id),
    )
    applyState(next)
  }

  async function removeQueueItem(itemId: string) {
    if (!state.value) return
    const next = await removePartyQueueTrack(state.value.inviteCode, itemId)
    applyState(next)
  }

  async function reorderQueueByIds(orderedItemIds: string[]) {
    if (!state.value) return
    const next = await reorderPartyQueue(state.value.inviteCode, orderedItemIds)
    applyState(next)
  }

  async function play(trackId: string, positionSec: number) {
    if (!state.value) return
    const next = await partyPlay(state.value.inviteCode, trackId, positionSec)
    applyState(next)
  }

  async function pause(positionSec: number) {
    if (!state.value) return
    const next = await partyPause(state.value.inviteCode, positionSec)
    applyState(next)
  }

  async function seek(positionSec: number) {
    if (!state.value) return
    const next = await partySeek(state.value.inviteCode, positionSec)
    applyState(next)
  }

  async function next() {
    if (!state.value) return
    const nextState = await partyNext(state.value.inviteCode)
    applyState(nextState)
  }

  async function prev() {
    if (!state.value) return
    const nextState = await partyPrev(state.value.inviteCode)
    applyState(nextState)
  }

  function startPolling() {
    clearPolling()
    pollTimer.value = setInterval(() => {
      void refreshState()
    }, POLL_INTERVAL_MS)
  }

  function clearPolling() {
    if (!pollTimer.value) return
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }

  function clearReconnectTimer() {
    if (!reconnectTimer.value) return
    clearTimeout(reconnectTimer.value)
    reconnectTimer.value = null
  }

  function stopRealtime() {
    clearReconnectTimer()
    if (!eventSource.value) return
    eventSource.value.close()
    eventSource.value = null
  }

  function scheduleReconnect() {
    if (!state.value || reconnectTimer.value) return
    reconnectTimer.value = setTimeout(() => {
      reconnectTimer.value = null
      connectRealtime()
      reconnectDelayMs.value = Math.min(reconnectDelayMs.value * 2, RECONNECT_MAX_DELAY_MS)
    }, reconnectDelayMs.value)
  }

  function connectRealtime() {
    if (!state.value) return

    stopRealtime()
    const source = new EventSource(
      `${import.meta.env.VITE_API_URL}/parties/${state.value.inviteCode}/events`,
      { withCredentials: true },
    )
    eventSource.value = source

    source.onopen = () => {
      reconnectDelayMs.value = 1000
      clearReconnectTimer()
    }

    source.addEventListener('state', (event) => {
      reconnectDelayMs.value = 1000
      const message = event as MessageEvent<string>
      const next = JSON.parse(message.data) as PartyStateResponse
      applyState(next)
    })

    source.addEventListener('ended', () => {
      applyState(null)
      stopRealtime()
    })

    source.onerror = () => {
      if (eventSource.value !== source) return
      stopRealtime()
      scheduleReconnect()
    }
  }

  function startRealtime() {
    reconnectDelayMs.value = 1000
    clearReconnectTimer()
    connectRealtime()
  }

  function stopPolling() {
    clearPolling()
    stopRealtime()
  }

  return {
    state,
    loading,
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
  }
})
