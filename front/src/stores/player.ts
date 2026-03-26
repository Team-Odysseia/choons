import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { streamUrl } from '@/api/tracks'
import type { TrackResponse } from '@/api/types'

export type LoopMode = 'none' | 'queue' | 'track'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
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
  const savedVolume = parseFloat(localStorage.getItem('volume') ?? '1')
  const volume = ref(savedVolume)
  const loopMode = ref<LoopMode>('none')
  const isShuffled = ref(false)
  audio.volume = savedVolume

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
  })
  audio.addEventListener('durationchange', () => {
    duration.value = audio.duration || 0
  })
  audio.addEventListener('ended', () => {
    if (loopMode.value === 'track') {
      audio.currentTime = 0
      audio.play()
    } else {
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
    currentTrack.value = track
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
    audio.src = streamUrl(track.id)
    audio.load()
    audio.play()
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
      audio.play()
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
    localStorage.setItem('volume', String(vol))
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
  }
})
