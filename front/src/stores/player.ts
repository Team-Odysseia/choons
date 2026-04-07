import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { streamUrl, recordStream } from '@/api/tracks'
import { usePartyStore } from './party'
import type { TrackResponse } from '@/api/types'

export type LoopMode = 'none' | 'queue' | 'track'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = a[i]
    const target = a[j]
    if (current === undefined || target === undefined) continue
    a[i] = target
    a[j] = current
  }
  return a
}

export const usePlayerStore = defineStore('player', () => {
  const audio = new Audio()
  audio.preload = 'metadata'

  const currentTrack = ref<TrackResponse | null>(null)
  const queue = ref<TrackResponse[]>([])
  const originalQueue = ref<TrackResponse[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = useLocalStorage('volume', 1)
  const loopMode = ref<LoopMode>('none')
  const isShuffled = ref(false)
  const streamRecorded = ref(false)
  const partyAdvanceInFlight = ref(false)
  audio.volume = volume.value

  // ─── Media Session ──────────────────────────────────────────────────────────

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => { isPlaying.value = false }))
    navigator.mediaSession.setActionHandler('pause', () => audio.pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev())
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
  }

  watch(currentTrack, (track) => {
    if (!('mediaSession' in navigator)) return
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
      })
    } else {
      navigator.mediaSession.metadata = null
    }
  })

  // ─── Audio events ────────────────────────────────────────────────────────────

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
    if (!streamRecorded.value && currentTrack.value && duration.value > 0) {
      const threshold = Math.min(30, duration.value * 0.5)
      if (audio.currentTime >= threshold) {
        streamRecorded.value = true
        recordStream(currentTrack.value.id).catch(() => {})
      }
    }
  })
  audio.addEventListener('durationchange', () => {
    duration.value = audio.duration || 0
  })
  audio.addEventListener('ended', () => {
    if (loopMode.value === 'track') {
      audio.currentTime = 0
      audio.play().catch(() => { isPlaying.value = false })
    } else {
      const party = usePartyStore()
      if (party.inParty && party.canControl) {
        if (partyAdvanceInFlight.value) return
        partyAdvanceInFlight.value = true
        void party.next().finally(() => {
          partyAdvanceInFlight.value = false
        })
        return
      }
      playNext()
    }
  })
  audio.addEventListener('play', () => {
    isPlaying.value = true
  })
  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  const hasNext = computed(() =>
    loopMode.value === 'queue'
      ? queue.value.length > 1
      : currentIndex.value < queue.value.length - 1,
  )
  const hasPrev = computed(() =>
    loopMode.value === 'queue'
      ? queue.value.length > 1
      : currentIndex.value > 0,
  )

  function playTrack(track: TrackResponse, trackQueue?: TrackResponse[], index?: number) {
    if (!currentTrack.value || currentTrack.value.id !== track.id) {
      currentTrack.value = track
    }
    if (trackQueue) {
      originalQueue.value = trackQueue
      if (isShuffled.value) {
        const shuffled = shuffleArray(trackQueue.filter((t) => t.id !== track.id))
        queue.value = [track, ...shuffled]
        currentIndex.value = 0
      } else {
        queue.value = trackQueue
        currentIndex.value = index ?? 0
      }
    } else {
      currentIndex.value = index ?? 0
    }
    streamRecorded.value = false
    audio.src = streamUrl(track.id)
    audio.play().catch(() => {
      isPlaying.value = false
    })
  }

  function playQueue(tracks: TrackResponse[], startIndex = 0) {
    const track = tracks[startIndex]
    if (!track) return
    playTrack(track, tracks, startIndex)
  }

  function playQueueShuffled(tracks: TrackResponse[]) {
    if (tracks.length === 0) return
    isShuffled.value = true
    const startIndex = Math.floor(Math.random() * tracks.length)
    const track = tracks[startIndex]
    if (!track) return
    playTrack(track, tracks, startIndex)
  }

  function playNext() {
    if (loopMode.value === 'queue' && currentIndex.value === queue.value.length - 1) {
      const track = queue.value[0]
      if (track) playTrack(track, undefined, 0)
    } else if (currentIndex.value < queue.value.length - 1) {
      const next = currentIndex.value + 1
      const track = queue.value[next]
      if (track) playTrack(track, undefined, next)
    }
  }

  function playPrev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (loopMode.value === 'queue' && currentIndex.value === 0) {
      const last = queue.value.length - 1
      const track = queue.value[last]
      if (track) playTrack(track, undefined, last)
    } else if (currentIndex.value > 0) {
      const prev = currentIndex.value - 1
      const track = queue.value[prev]
      if (track) playTrack(track, undefined, prev)
    }
  }

  function togglePlay() {
    if (audio.paused) {
      audio.play().catch(() => { isPlaying.value = false })
    } else {
      audio.pause()
    }
  }

  function seek(time: number) {
    audio.currentTime = time
  }

  function setVolume(vol: number) {
    volume.value = vol
    audio.volume = vol
  }

  function cycleLoop() {
    if (loopMode.value === 'none') loopMode.value = 'queue'
    else if (loopMode.value === 'queue') loopMode.value = 'track'
    else loopMode.value = 'none'
  }

  function toggleShuffle() {
    if (!isShuffled.value) {
      isShuffled.value = true
      if (currentTrack.value && queue.value.length > 1) {
        const rest = shuffleArray(queue.value.filter((t) => t.id !== currentTrack.value!.id))
        queue.value = [currentTrack.value, ...rest]
        currentIndex.value = 0
      }
    } else {
      isShuffled.value = false
      if (originalQueue.value.length > 0) {
        const idx = originalQueue.value.findIndex((t) => t.id === currentTrack.value?.id)
        queue.value = originalQueue.value
        currentIndex.value = idx !== -1 ? idx : 0
      }
    }
  }

  function addToQueue(track: TrackResponse) {
    queue.value.push(track)
    if (originalQueue.value !== queue.value) originalQueue.value.push(track)
  }

  function addTracksToQueue(tracks: TrackResponse[]) {
    queue.value.push(...tracks)
    if (originalQueue.value !== queue.value) originalQueue.value.push(...tracks)
  }

  function removeFromQueue(index: number) {
    const removed = queue.value[index]
    if (!removed) return
    queue.value.splice(index, 1)
    const origIdx = originalQueue.value.findIndex((t) => t.id === removed.id)
    if (origIdx !== -1) originalQueue.value.splice(origIdx, 1)
    if (index < currentIndex.value) {
      currentIndex.value--
    }
  }

  function reorderQueue() {
    if (currentTrack.value) {
      const newIdx = queue.value.findIndex((t) => t.id === currentTrack.value!.id)
      if (newIdx !== -1) currentIndex.value = newIdx
    }
  }

  function clearQueue() {
    if (currentTrack.value) {
      queue.value = [currentTrack.value]
      originalQueue.value = [currentTrack.value]
      currentIndex.value = 0
    } else {
      queue.value = []
      originalQueue.value = []
      currentIndex.value = -1
    }
  }

  function stop() {
    audio.pause()
    audio.src = ''
    currentTrack.value = null
    queue.value = []
    originalQueue.value = []
    currentIndex.value = -1
    isPlaying.value = false
    streamRecorded.value = false
  }

  function syncExternalState(
    track: TrackResponse | null,
    queueTracks: TrackResponse[],
    playing: boolean,
    positionSec: number,
  ) {
    queue.value = [...queueTracks]
    originalQueue.value = [...queueTracks]

    if (!track) {
      currentTrack.value = null
      currentIndex.value = -1
      audio.pause()
      isPlaying.value = false
      return
    }

    if (!currentTrack.value || currentTrack.value.id !== track.id) {
      currentTrack.value = track
    }
    const idx = queueTracks.findIndex((t) => t.id === track.id)
    currentIndex.value = idx >= 0 ? idx : 0

    const nextSrc = streamUrl(track.id)
    if (audio.src !== nextSrc) {
      audio.src = nextSrc
    }

    const safePos = Number.isFinite(positionSec) ? Math.max(0, positionSec) : 0
    if (Math.abs(audio.currentTime - safePos) > 2) {
      audio.currentTime = safePos
      currentTime.value = safePos
    }

    if (playing && audio.paused) {
      audio.play().catch(() => {
        isPlaying.value = false
      })
    }
    if (!playing && !audio.paused) {
      audio.pause()
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
