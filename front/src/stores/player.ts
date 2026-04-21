import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { streamUrl, recordStream } from '@/api/tracks'
import { emitter } from '@/lib/emitter'
import { useAudioEngine } from '@/composables/useAudioEngine'
import { useQueue } from '@/composables/useQueue'
import { useMediaSession } from '@/composables/useMediaSession'
import type { TrackResponse } from '@/api/types'

export type LoopMode = 'none' | 'queue' | 'track'

export const usePlayerStore = defineStore('player', () => {
  const audioEngine = useAudioEngine()
  const queueManager = useQueue()
  const volume = useLocalStorage('volume', 1)
  const streamRecorded = ref(false)
  const partyAdvanceInFlight = ref(false)
  const partyInParty = ref(false)
  const partyCanControl = ref(false)
  const partyNextFn = ref<(() => Promise<boolean>) | null>(null)

  audioEngine.setVolume(volume.value)

  // ─── Media Session ──────────────────────────────────────────────────────────

  useMediaSession(
    queueManager.currentTrack,
    {
      onPlay: () => audioEngine.play().catch(() => {}),
      onPause: () => audioEngine.pause(),
      onPreviousTrack: () => playPrev(),
      onNextTrack: () => playNext(),
    },
  )

  // ─── Event bus listeners ────────────────────────────────────────────────────

  emitter.on('party:stateChanged', (party) => {
    if (!party) return

    const queueTracks = party.queue.map((item) => item.track)
    const playbackTrack = party.playback.track
    const now = Date.now()
    const elapsedSec = Math.max(0, (now - party.playback.anchorEpochMs) / 1000)
    const position = party.playback.playing
      ? party.playback.anchorPositionSec + elapsedSec
      : party.playback.anchorPositionSec

    syncExternalState(playbackTrack, queueTracks, party.playback.playing, position)
  })

  emitter.on('party:joined', ({ next }) => {
    partyInParty.value = true
    partyNextFn.value = next
  })

  emitter.on('party:left', () => {
    partyInParty.value = false
    partyCanControl.value = false
    partyNextFn.value = null
  })

  emitter.on('auth:logout', () => {
    stop()
  })

  // ─── Audio events ────────────────────────────────────────────────────────────

  audioEngine.onEnded(() => {
    if (queueManager.loopMode.value === 'track') {
      audioEngine.seek(0)
      audioEngine.play().catch(() => {})
    } else {
      if (partyInParty.value && partyNextFn.value) {
        if (partyAdvanceInFlight.value) return
        partyAdvanceInFlight.value = true
        void partyNextFn.value().then((handled) => {
          partyAdvanceInFlight.value = false
          if (!handled) playNext()
        })
        return
      }
      playNext()
    }
  })

  audioEngine.audio.addEventListener('timeupdate', () => {
    const time = audioEngine.getCurrentTime()
    if (!streamRecorded.value && queueManager.currentTrack.value && audioEngine.duration.value > 0) {
      const threshold = Math.min(30, audioEngine.duration.value * 0.5)
      if (time >= threshold) {
        streamRecorded.value = true
        recordStream(queueManager.currentTrack.value.id).catch(() => {})
      }
    }
  })

  // ─── Public API ─────────────────────────────────────────────────────────────

  const currentTrack = queueManager.currentTrack
  const queue = queueManager.queue
  const currentIndex = queueManager.currentIndex
  const isPlaying = audioEngine.isPlaying
  const currentTime = audioEngine.currentTime
  const duration = audioEngine.duration
  const loopMode = queueManager.loopMode
  const isShuffled = queueManager.isShuffled
  const hasNext = queueManager.hasNext
  const hasPrev = queueManager.hasPrev

  function playTrack(track: TrackResponse, trackQueue?: TrackResponse[], index?: number) {
    queueManager.playTrack(track, trackQueue, index)
    streamRecorded.value = false
    audioEngine.setSrc(streamUrl(track.id))
    audioEngine.play().catch(() => {
      audioEngine.isPlaying.value = false
    })
  }

  function playQueue(tracks: TrackResponse[], startIndex = 0) {
    const track = tracks[startIndex]
    if (!track) return
    playTrack(track, tracks, startIndex)
  }

  function playQueueShuffled(tracks: TrackResponse[]) {
    if (tracks.length === 0) return
    queueManager.isShuffled.value = true
    const startIndex = Math.floor(Math.random() * tracks.length)
    const track = tracks[startIndex]
    if (!track) return
    playTrack(track, tracks, startIndex)
  }

  function playNext() {
    queueManager.playNext()
    const track = queueManager.currentTrack.value
    if (track) {
      streamRecorded.value = false
      audioEngine.setSrc(streamUrl(track.id))
      audioEngine.play().catch(() => {
        audioEngine.isPlaying.value = false
      })
    }
  }

  function playPrev() {
    if (audioEngine.getCurrentTime() > 3) {
      audioEngine.seek(0)
      return
    }
    queueManager.playPrev()
    const track = queueManager.currentTrack.value
    if (track) {
      streamRecorded.value = false
      audioEngine.setSrc(streamUrl(track.id))
      audioEngine.play().catch(() => {
        audioEngine.isPlaying.value = false
      })
    }
  }

  function togglePlay() {
    if (audioEngine.audio.paused) {
      audioEngine.play().catch(() => {
        audioEngine.isPlaying.value = false
      })
    } else {
      audioEngine.pause()
    }
  }

  function seek(time: number) {
    audioEngine.seek(time)
  }

  function setVolume(vol: number) {
    volume.value = vol
    audioEngine.setVolume(vol)
  }

  function cycleLoop() {
    queueManager.cycleLoop()
  }

  function toggleShuffle() {
    queueManager.toggleShuffle()
  }

  function addToQueue(track: TrackResponse) {
    queueManager.addToQueue(track)
  }

  function addTracksToQueue(tracks: TrackResponse[]) {
    queueManager.addTracksToQueue(tracks)
  }

  function removeFromQueue(index: number) {
    queueManager.removeFromQueue(index)
  }

  function reorderQueue() {
    queueManager.reorderQueue()
  }

  function clearQueue() {
    queueManager.clearQueue()
  }

  function stop() {
    audioEngine.stop()
    queueManager.reset()
    streamRecorded.value = false
  }

  function syncExternalState(
    track: TrackResponse | null,
    queueTracks: TrackResponse[],
    playing: boolean,
    positionSec: number,
  ) {
    queueManager.queue.value = [...queueTracks]
    queueManager.originalQueue.value = [...queueTracks]

    if (!track) {
      queueManager.currentTrack.value = null
      queueManager.currentIndex.value = -1
      audioEngine.pause()
      return
    }

    const current = queueManager.currentTrack.value
    if (!current || current.id !== track.id) {
      queueManager.currentTrack.value = track
    }
    const idx = queueTracks.findIndex((t) => t.id === track.id)
    queueManager.currentIndex.value = idx >= 0 ? idx : 0

    const nextSrc = streamUrl(track.id)
    if (audioEngine.audio.src !== nextSrc) {
      audioEngine.setSrc(nextSrc)
    }

    const safePos = Number.isFinite(positionSec) ? Math.max(0, positionSec) : 0
    const driftThreshold = playing ? 1.2 : 0.25
    if (Math.abs(audioEngine.currentTime.value - safePos) > driftThreshold) {
      audioEngine.seek(safePos)
    }

    if (playing && audioEngine.audio.paused) {
      audioEngine.play().catch(() => {
        audioEngine.isPlaying.value = false
      })
    }
    if (!playing && !audioEngine.audio.paused) {
      audioEngine.pause()
    }
  }

  return {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    loopMode,
    isShuffled,
    hasNext,
    hasPrev,
    playTrack,
    playQueue,
    playQueueShuffled,
    playNext,
    playPrev,
    togglePlay,
    seek,
    setVolume,
    cycleLoop,
    toggleShuffle,
    addToQueue,
    addTracksToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    stop,
    syncExternalState,
  }
})
