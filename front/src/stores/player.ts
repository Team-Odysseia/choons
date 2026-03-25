import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { streamUrl } from '@/api/tracks'
import type { TrackResponse } from '@/api/types'

export const usePlayerStore = defineStore('player', () => {
  const audio = new Audio()
  audio.preload = 'metadata'

  const currentTrack = ref<TrackResponse | null>(null)
  const queue = ref<TrackResponse[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime
  })
  audio.addEventListener('durationchange', () => {
    duration.value = audio.duration || 0
  })
  audio.addEventListener('ended', () => {
    playNext()
  })
  audio.addEventListener('play', () => {
    isPlaying.value = true
  })
  audio.addEventListener('pause', () => {
    isPlaying.value = false
  })

  const hasNext = computed(() => currentIndex.value < queue.value.length - 1)
  const hasPrev = computed(() => currentIndex.value > 0)

  function playTrack(track: TrackResponse, trackQueue?: TrackResponse[], index?: number) {
    currentTrack.value = track
    queue.value = trackQueue ?? [track]
    currentIndex.value = index ?? 0
    audio.src = streamUrl(track.id)
    audio.load()
    audio.play()
  }

  function playQueue(tracks: TrackResponse[], startIndex = 0) {
    const track = tracks[startIndex]
    if (!track) return
    playTrack(track, tracks, startIndex)
  }

  function playNext() {
    if (hasNext.value) {
      const next = currentIndex.value + 1
      const track = queue.value[next]
      if (track) playTrack(track, queue.value, next)
    }
  }

  function playPrev() {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (hasPrev.value) {
      const prev = currentIndex.value - 1
      const track = queue.value[prev]
      if (track) playTrack(track, queue.value, prev)
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
    hasNext,
    hasPrev,
    playTrack,
    playQueue,
    playNext,
    playPrev,
    togglePlay,
    seek,
    setVolume,
    addToQueue,
  }
})
