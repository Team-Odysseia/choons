import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Spectrum from '../Spectrum.vue'
import { mockReducedMotion } from '@/test-utils/matchMedia'

const originalGetContext = HTMLCanvasElement.prototype.getContext

function stubCanvasSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height)
}

function useFakeContext() {
  const ctx = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
  }
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => ctx, configurable: true, writable: true })
  return ctx
}

describe('Spectrum', () => {
  afterEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: originalGetContext, configurable: true, writable: true })
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not start raf when inactive', () => {
    stubCanvasSize(200, 60)
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    mount(Spectrum, { props: { active: false } })
    expect(raf).not.toHaveBeenCalled()
  })

  it('starts raf when active and visible', async () => {
    stubCanvasSize(200, 60)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const wrapper = mount(Spectrum, { props: { active: true } })
    await wrapper.vm.$nextTick()
    expect(raf).toHaveBeenCalled()
  })

  it('does not start raf while the canvas is hidden (zero size)', async () => {
    stubCanvasSize(0, 0)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const wrapper = mount(Spectrum, { props: { active: true } })
    await wrapper.vm.$nextTick()
    expect(raf).not.toHaveBeenCalled()
  })

  it('sizes the backing store to whole device pixels', () => {
    stubCanvasSize(101, 41)
    vi.stubGlobal('devicePixelRatio', 1.5)
    useFakeContext()
    const wrapper = mount(Spectrum, { props: { active: false } })
    const canvas = wrapper.find('canvas').element
    expect(canvas instanceof HTMLCanvasElement && canvas.width).toBe(152)
    expect(canvas instanceof HTMLCanvasElement && canvas.height).toBe(62)
  })

  it('does not use per-rect shadow blur', async () => {
    vi.resetModules()
    mockReducedMotion(true)
    stubCanvasSize(100, 40)
    const ctx = useFakeContext()
    const blurs: number[] = []
    Object.defineProperty(ctx, 'shadowBlur', { set: (v: number) => blurs.push(v), get: () => 0 })
    const { default: ReducedSpectrum } = await import('../Spectrum.vue')
    mount(ReducedSpectrum, { props: { active: true } })
    expect(ctx.fillRect).toHaveBeenCalled()
    expect(blurs.filter((b) => b > 0)).toHaveLength(0)
  })

  it('is hidden from assistive tech', () => {
    const wrapper = mount(Spectrum, { props: { active: false } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })
})
