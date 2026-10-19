import { describe, it, expect } from 'vitest'
import { useQueue } from '../useQueue'
import { makeTrack } from '@/test-utils/fixtures'

const a = makeTrack({ id: 'a' })
const b = makeTrack({ id: 'b' })
const c = makeTrack({ id: 'c' })

describe('useQueue', () => {
  it('starts a queue at the given index', () => {
    const q = useQueue()
    q.playQueue([a, b, c], 1)
    expect(q.currentTrack.value?.id).toBe('b')
    expect(q.currentIndex.value).toBe(1)
    expect(q.hasPrev.value).toBe(true)
    expect(q.hasNext.value).toBe(true)
  })

  it('plays a lone track as a one-item queue', () => {
    const q = useQueue()
    q.playTrack(a)
    expect(q.queue.value.map((t) => t.id)).toEqual(['a'])
    expect(q.hasNext.value).toBe(false)
  })

  it('stops at the ends without looping', () => {
    const q = useQueue()
    q.playQueue([a, b], 1)
    q.playNext()
    expect(q.currentTrack.value?.id).toBe('b')
    q.playQueue([a, b], 0)
    q.playPrev()
    expect(q.currentTrack.value?.id).toBe('a')
  })

  it('wraps around when looping the queue', () => {
    const q = useQueue()
    q.cycleLoop()
    q.playQueue([a, b, c], 2)
    q.playNext()
    expect(q.currentTrack.value?.id).toBe('a')
    q.playPrev()
    expect(q.currentTrack.value?.id).toBe('c')
  })

  it('cycles loop modes', () => {
    const q = useQueue()
    const seen = [q.loopMode.value]
    for (let i = 0; i < 3; i++) {
      q.cycleLoop()
      seen.push(q.loopMode.value)
    }
    expect(seen).toEqual(['none', 'queue', 'track', 'none'])
  })

  it('shuffles around the current track and restores order', () => {
    const q = useQueue()
    q.playQueue([a, b, c], 1)
    q.toggleShuffle()
    expect(q.queue.value[0]?.id).toBe('b')
    expect(q.currentIndex.value).toBe(0)
    expect(q.queue.value.map((t) => t.id).sort()).toEqual(['a', 'b', 'c'])

    q.toggleShuffle()
    expect(q.queue.value.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(q.currentIndex.value).toBe(1)
  })

  it('puts the chosen track first when starting shuffled', () => {
    const q = useQueue()
    q.isShuffled.value = true
    q.playQueue([a, b, c], 2)
    expect(q.queue.value[0]?.id).toBe('c')
    expect(q.currentIndex.value).toBe(0)
  })

  it('adds tracks to both the queue and the original order', () => {
    const q = useQueue()
    q.playQueue([a], 0)
    q.toggleShuffle()
    q.addTracksToQueue([b, c])
    q.toggleShuffle()
    expect(q.queue.value.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('keeps the current index when removing an earlier track', () => {
    const q = useQueue()
    q.playQueue([a, b, c], 2)
    q.removeFromQueue(0)
    expect(q.currentIndex.value).toBe(1)
    expect(q.currentTrack.value?.id).toBe('c')
  })

  it('ignores removal of a missing index', () => {
    const q = useQueue()
    q.playQueue([a, b], 0)
    q.removeFromQueue(5)
    expect(q.queue.value).toHaveLength(2)
  })

  it('follows the current track after a reorder', () => {
    const q = useQueue()
    q.playQueue([a, b, c], 0)
    q.queue.value = [b, c, a]
    q.reorderQueue()
    expect(q.currentIndex.value).toBe(2)
  })

  it('clears everything but the current track', () => {
    const q = useQueue()
    q.playQueue([a, b, c], 1)
    q.clearQueue()
    expect(q.queue.value.map((t) => t.id)).toEqual(['b'])
    expect(q.currentIndex.value).toBe(0)
  })

  it('resets all state', () => {
    const q = useQueue()
    q.cycleLoop()
    q.playQueue([a, b], 1)
    q.reset()
    expect(q.queue.value).toEqual([])
    expect(q.currentTrack.value).toBeNull()
    expect(q.currentIndex.value).toBe(-1)
    expect(q.loopMode.value).toBe('none')
  })
})
