import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockReducedMotion } from '@/test-utils/matchMedia'

async function loadMotion() {
  vi.resetModules()
  return import('@/lib/motion')
}

describe('prefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is true when the OS asks for reduced motion', async () => {
    mockReducedMotion(true)
    const { prefersReducedMotion } = await loadMotion()
    expect(prefersReducedMotion.value).toBe(true)
  })

  it('is false when the OS has no motion preference', async () => {
    mockReducedMotion(false)
    const { prefersReducedMotion } = await loadMotion()
    expect(prefersReducedMotion.value).toBe(false)
  })
})
