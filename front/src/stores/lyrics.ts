import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { usePlayerStore } from './player'
import { fetchLyricsByLrclibId, searchLyrics } from '@/api/lyrics'
import type { TrackResponse } from '@/api/types'

export interface ParsedLine {
  timeMs: number
  text: string
}

export function parseLrc(lrc: string): ParsedLine[] {
  const result: ParsedLine[] = []
  const regex = /\[(\d+):(\d+\.\d+)\](.*)/
  for (const raw of lrc.split('\n')) {
    const m = raw.match(regex)
    if (!m) continue
    const text = (m[3] ?? '').trim()
    if (!text) continue
    const minutes = Number.parseInt(m[1] ?? '0', 10)
    const seconds = Number.parseFloat(m[2] ?? '0')
    result.push({ timeMs: (minutes * 60 + seconds) * 1000, text })
  }
  return result.sort((a, b) => a.timeMs - b.timeMs)
}

function binarySearchLineIndex(lines: ParsedLine[], ms: number): number {
  let left = 0
  let right = lines.length - 1
  let result = -1

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (lines[mid]!.timeMs <= ms) {
      result = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return result
}

export const useLyricsStore = defineStore('lyrics', () => {
  const player = usePlayerStore()

  const loading = ref(false)
  const error = ref(false)
  const plainLyrics = ref<string | null>(null)
  const lines = ref<ParsedLine[]>([])
  let abortController: AbortController | null = null

  const hasTimedLyrics = computed(() => lines.value.length > 0)

  const activeLineIndex = computed(() => {
    if (!hasTimedLyrics.value) return -1
    const ms = player.currentTime * 1000
    return binarySearchLineIndex(lines.value, ms)
  })

  async function fetchLyrics(track: TrackResponse) {
    if (abortController) abortController.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    loading.value = true
    error.value = false
    plainLyrics.value = null
    lines.value = []
    try {
      let data = null
      if (track.lrclibId != null) {
        data = await fetchLyricsByLrclibId(track.lrclibId, signal)
      }
      if (!data) {
        data = await searchLyrics(track.title, track.artist.name, track.album.title, track.durationSeconds, signal)
      }
      if (signal.aborted) return
      if (!data || data.instrumental) return
      if (data.syncedLyrics) {
        lines.value = parseLrc(data.syncedLyrics)
      }
      plainLyrics.value = data.plainLyrics
    } catch (e: any) {
      if (e.name === 'AbortError') return
      error.value = true
    } finally {
      loading.value = false
    }
  }

  watch(
    () => player.currentTrack?.id,
    (track) => {
      if (track && player.currentTrack) {
        fetchLyrics(player.currentTrack)
      } else {
        if (abortController) abortController.abort()
        loading.value = false
        error.value = false
        plainLyrics.value = null
        lines.value = []
      }
    },
    { immediate: true },
  )

  return { loading, error, plainLyrics, lines, hasTimedLyrics, activeLineIndex }
})
