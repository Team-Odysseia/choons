import { describe, expect, it } from 'vitest'
import { simulateLevels } from '@/lib/spectrum'

describe('simulateLevels', () => {
  it('same inputs give same output', () => {
    expect(simulateLevels(1234, 24, 12, 3, 0.8)).toEqual(simulateLevels(1234, 24, 12, 3, 0.8))
  })

  it('returns one level per bar', () => {
    expect(simulateLevels(0, 24, 12, 1, 0.8)).toHaveLength(24)
  })

  it('energy 0 is all zeros', () => {
    expect(simulateLevels(500, 16, 10, 2, 0).every((v) => v === 0)).toBe(true)
  })

  it('values within 0..segments', () => {
    for (const t of [0, 250, 1000, 99999]) {
      for (const v of simulateLevels(t, 24, 12, 7, 1.5)) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(12)
      }
    }
  })

  it('changes over time', () => {
    expect(simulateLevels(0, 24, 12, 3, 0.8)).not.toEqual(simulateLevels(400, 24, 12, 3, 0.8))
  })
})
