import { describe, expect, it } from 'vitest'
import { formatDuration, totalMinutes } from '@/lib/format'

describe('formatDuration', () => {
  it('formats seconds as m:ss', () => {
    expect(formatDuration(238)).toBe('3:58')
    expect(formatDuration(5)).toBe('0:05')
  })

  it('returns 0:00 for invalid input', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('floors fractional seconds', () => {
    expect(formatDuration(61.9)).toBe('1:01')
  })
})

describe('totalMinutes', () => {
  it('rounds the summed seconds to whole minutes', () => {
    expect(totalMinutes([{ durationSeconds: 238 }, { durationSeconds: 200 }])).toBe(7)
    expect(totalMinutes([])).toBe(0)
  })
})
