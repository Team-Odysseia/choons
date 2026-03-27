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
    const text = m[3].trim()
    if (!text) continue
    const minutes = parseInt(m[1])
    const seconds = parseFloat(m[2])
    result.push({ timeMs: (minutes * 60 + seconds) * 1000, text })
  }
  return result.sort((a, b) => a.timeMs - b.timeMs)
}

export const useLyricsStore = defineStore('lyrics', () => {
  const player = usePlayerStore()

  const loading = ref(false)
  const error = ref(false)
  const plainLyrics = ref<string | null>(null)
  const lines = ref<ParsedLine[]>([])

  const hasTimedLyrics = computed(() => lines.value.length > 0)

  const activeLineIndex = computed(() => {
    if (!hasTimedLyrics.value) return -1
    const ms = player.currentTime * 1000
    let idx = -1
    for (let i = 0; i < lines.value.length; i++) {
      if (lines.value[i].timeMs <= ms) idx = i
      else break
    }
    return idx
  })

  async function fetchLyrics(track: TrackResponse) {
    loading.value = true
    error.value = false
    plainLyrics.value = null
    lines.value = []
    try {
      let data = null
      if (track.lrclibId != null) {
        data = await fetchLyricsByLrclibId(track.lrclibId)
      }
      if (!data) {
        data = await searchLyrics(track.title, track.artist.name, track.album.title, track.durationSeconds)
      }
      if (!data || data.instrumental) return
      if (data.syncedLyrics) {
        lines.value = parseLrc(data.syncedLyrics)
      }
      plainLyrics.value = data.plainLyrics
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  watch(
    () => player.currentTrack,
    (track) => {
      if (track) {
        fetchLyrics(track)
      } else {
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
