import { ref, computed } from 'vue'
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

export function useQueue() {
  const queue = ref<TrackResponse[]>([])
  const originalQueue = ref<TrackResponse[]>([])
  const currentIndex = ref(-1)
  const currentTrack = ref<TrackResponse | null>(null)
  const isShuffled = ref(false)
  const loopMode = ref<LoopMode>('none')

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
      if (queue.value.length === 0) {
        queue.value = [track]
        originalQueue.value = [track]
        currentIndex.value = 0
      }
    }
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

  function cycleLoop() {
    if (loopMode.value === 'none') loopMode.value = 'queue'
    else if (loopMode.value === 'queue') loopMode.value = 'track'
    else loopMode.value = 'none'
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

  function reset() {
    queue.value = []
    originalQueue.value = []
    currentIndex.value = -1
    currentTrack.value = null
    isShuffled.value = false
    loopMode.value = 'none'
  }

  return {
    queue,
    originalQueue,
    currentIndex,
    currentTrack,
    isShuffled,
    loopMode,
    hasNext,
    hasPrev,
    playTrack,
    playQueue,
    playQueueShuffled,
    playNext,
    playPrev,
    toggleShuffle,
    cycleLoop,
    addToQueue,
    addTracksToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    reset,
  }
}
