import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { mockReducedMotion } from '@/test-utils/matchMedia'

function stubSizes(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth)
}

async function mountMarquee(text: string) {
  vi.resetModules()
  const { default: Marquee } = await import('../Marquee.vue')
  const wrapper = mount(Marquee, { props: { text } })
  await flushPromises()
  return wrapper
}

describe('Marquee', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does not scroll when text fits', async () => {
    stubSizes(100, 200)
    const wrapper = await mountMarquee('Night Signal')
    expect(wrapper.classes()).not.toContain('is-scrolling')
    expect(wrapper.findAll('[data-marquee-copy]')).toHaveLength(1)
  })

  it('scrolls when overflowing', async () => {
    stubSizes(500, 200)
    const wrapper = await mountMarquee('A very long title that overflows the display window')
    expect(wrapper.classes()).toContain('is-scrolling')
    expect(wrapper.findAll('[data-marquee-copy]')).toHaveLength(2)
  })

  it('never scrolls with reduced motion', async () => {
    mockReducedMotion(true)
    stubSizes(500, 200)
    const wrapper = await mountMarquee('A very long title that overflows the display window')
    expect(wrapper.classes()).not.toContain('is-scrolling')
  })

  it('exposes the text once to assistive tech', async () => {
    stubSizes(500, 200)
    const wrapper = await mountMarquee('Long title')
    const copies = wrapper.findAll('[data-marquee-copy]')
    expect(copies[1]!.attributes('aria-hidden')).toBe('true')
  })
})

describe('Marquee bounce mode', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  async function mountBounce(text: string) {
    vi.resetModules()
    const { default: Marquee } = await import('../Marquee.vue')
    const wrapper = mount(Marquee, { props: { text, mode: 'bounce' } })
    await flushPromises()
    return wrapper
  }

  it('bounces with a single copy when overflowing', async () => {
    stubSizes(260, 200)
    const wrapper = await mountBounce('Album Requests and more')
    expect(wrapper.classes()).toContain('is-bouncing')
    expect(wrapper.classes()).not.toContain('is-scrolling')
    expect(wrapper.findAll('[data-marquee-copy]')).toHaveLength(1)
    expect(wrapper.find('.vfd-marquee__track').attributes('style')).toContain('--marquee-distance: 60px')
  })

  it('stays still when the text fits', async () => {
    stubSizes(100, 200)
    const wrapper = await mountBounce('Library')
    expect(wrapper.classes()).not.toContain('is-bouncing')
  })

  it('truncates instead of moving under reduced motion', async () => {
    mockReducedMotion(true)
    stubSizes(260, 200)
    const wrapper = await mountBounce('Album Requests and more')
    expect(wrapper.classes()).not.toContain('is-bouncing')
    expect(wrapper.find('[data-marquee-copy]').classes()).toContain('truncate')
  })
})
