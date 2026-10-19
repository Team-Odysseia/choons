import { describe, expect, it } from 'vitest'
import { volumeToDb } from '@/lib/level'

describe('volumeToDb', () => {
  it('0 gives -∞dB', () => {
    expect(volumeToDb(0)).toBe('-∞dB')
  })

  it('1 gives 0dB', () => {
    expect(volumeToDb(1)).toBe('0dB')
  })

  it('0.5 gives -6dB', () => {
    expect(volumeToDb(0.5)).toBe('-6dB')
  })
})
