import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { parseLrc, useLyricsStore } from '../lyrics'
import { usePlayerStore } from '../player'
import type { TrackResponse } from '@/api/types'

const { fetchLyricsByLrclibIdMock, searchLyricsMock } = vi.hoisted(() => ({
  fetchLyricsByLrclibIdMock: vi.fn().mockResolvedValue(null),
  searchLyricsMock: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/api/lyrics', () => ({
  fetchLyricsByLrclibId: fetchLyricsByLrclibIdMock,
  searchLyrics: searchLyricsMock,
}))

function makeTrack(id: string): TrackResponse {
  return {
    id,
    title: `Track ${id}`,
    album: {
      id: 'album-1',
      title: 'Album',
      artist: { id: 'art-1', name: 'Artist', bio: '', createdAt: '', avatarUrl: null },
      releaseYear: 2024,
      createdAt: '',
      coverUrl: null,
    },
    artist: { id: 'art-1', name: 'Artist', bio: '', createdAt: '', avatarUrl: null },
    trackNumber: 1,
    durationSeconds: 180,
    createdAt: '',
    hifi: false,
    lrclibId: null,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  fetchLyricsByLrclibIdMock.mockClear()
  searchLyricsMock.mockClear()
})

describe('binary search activeLineIndex', () => {
  it('retorna indice correto para 500 linhas', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    // Gera 500 linhas com timestamps de 0ms a 499000ms
    store.lines = Array.from({ length: 500 }, (_, i) => ({
      timeMs: i * 1000,
      text: `Line ${i}`,
    }))

    ;(player as any).currentTime = 250.5 // 250500ms
    expect(store.activeLineIndex).toBe(250)

    ;(player as any).currentTime = 0.5 // 500ms
    expect(store.activeLineIndex).toBe(0)

    ;(player as any).currentTime = 499.5 // 499500ms
    expect(store.activeLineIndex).toBe(499)

    ;(player as any).currentTime = 0
    expect(store.activeLineIndex).toBe(0)
  })

  it('retorna -1 quando currentTime esta antes da primeira linha', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    store.lines = [{ timeMs: 5000, text: 'Intro' }]
    ;(player as any).currentTime = 1 // 1000ms
    expect(store.activeLineIndex).toBe(-1)
  })

  it('retorna ultima linha quando currentTime passa todas', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    store.lines = [
      { timeMs: 0, text: 'First' },
      { timeMs: 5000, text: 'Last' },
    ]
    ;(player as any).currentTime = 999
    expect(store.activeLineIndex).toBe(1)
  })
})

describe('fetchLyrics abort', () => {
  it('aborta requisicao anterior ao trocar de track', async () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    const signals: AbortSignal[] = []
    fetchLyricsByLrclibIdMock.mockImplementation((_id: number, signal?: AbortSignal) => {
      signals.push(signal!)
      return new Promise((resolve) => setTimeout(() => resolve(null), 50))
    })
    searchLyricsMock.mockImplementation((_title: string, _artist: string, _album: string, _duration: number, signal?: AbortSignal) => {
      signals.push(signal!)
      return new Promise((resolve) => setTimeout(() => resolve(null), 50))
    })

    player.currentTrack = makeTrack('1')
    await Promise.resolve()
    await Promise.resolve()

    expect(signals.length).toBeGreaterThanOrEqual(1)
    const firstSignal = signals[0]!
    expect(firstSignal.aborted).toBe(false)

    // Troca de track rapidamente
    player.currentTrack = makeTrack('2')
    await Promise.resolve()
    await Promise.resolve()

    expect(signals[0]!.aborted).toBe(true)
  })
})
