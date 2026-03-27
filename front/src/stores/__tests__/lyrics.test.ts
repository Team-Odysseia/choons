import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { parseLrc, useLyricsStore } from '../lyrics'
import { usePlayerStore } from '../player'

vi.mock('@/api/lyrics', () => ({
  fetchLyricsByLrclibId: vi.fn().mockResolvedValue(null),
  searchLyrics: vi.fn().mockResolvedValue(null),
}))

describe('parseLrc', () => {
  it('parses timed lines correctly', () => {
    const lrc = '[00:05.00] Hello world\n[00:10.50] Second line'
    const lines = parseLrc(lrc)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({ timeMs: 5000, text: 'Hello world' })
    expect(lines[1]).toEqual({ timeMs: 10500, text: 'Second line' })
  })

  it('skips blank lines', () => {
    const lrc = '[00:01.00] First\n[00:02.00]   \n[00:03.00] Third'
    const lines = parseLrc(lrc)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('First')
    expect(lines[1].text).toBe('Third')
  })

  it('skips lines without a timestamp', () => {
    const lrc = '[ti:Song Title]\n[00:01.00] Lyric'
    const lines = parseLrc(lrc)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('Lyric')
  })

  it('sorts lines by timestamp', () => {
    const lrc = '[00:10.00] Late\n[00:01.00] Early'
    const lines = parseLrc(lrc)
    expect(lines[0].text).toBe('Early')
    expect(lines[1].text).toBe('Late')
  })

  it('converts minutes and seconds to milliseconds correctly', () => {
    const lrc = '[01:30.25] One and a half'
    const lines = parseLrc(lrc)
    expect(lines[0].timeMs).toBe((60 + 30.25) * 1000)
  })

  it('returns empty array for empty input', () => {
    expect(parseLrc('')).toHaveLength(0)
  })
})

describe('useLyricsStore activeLineIndex', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns -1 when there are no timed lines', () => {
    const store = useLyricsStore()
    expect(store.activeLineIndex).toBe(-1)
  })

  it('returns the index of the line at or before currentTime', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    store.lines = [
      { timeMs: 0, text: 'Line 0' },
      { timeMs: 5000, text: 'Line 1' },
      { timeMs: 10000, text: 'Line 2' },
    ]
    ;(player as any).currentTime = 7 // 7000ms — at or before 5000ms line
    expect(store.activeLineIndex).toBe(1)
  })

  it('returns last line when currentTime is past all lines', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    store.lines = [
      { timeMs: 0, text: 'First' },
      { timeMs: 5000, text: 'Last' },
    ]
    ;(player as any).currentTime = 999
    expect(store.activeLineIndex).toBe(1)
  })

  it('returns -1 when currentTime is before the first line', () => {
    const store = useLyricsStore()
    const player = usePlayerStore()

    store.lines = [{ timeMs: 5000, text: 'Intro' }]
    ;(player as any).currentTime = 1
    expect(store.activeLineIndex).toBe(-1)
  })
})
