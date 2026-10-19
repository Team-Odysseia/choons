import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Spectrum from '../Spectrum.vue'

describe('Spectrum', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does not start raf when inactive', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    mount(Spectrum, { props: { active: false } })
    expect(raf).not.toHaveBeenCalled()
  })

  it('starts raf when active', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    mount(Spectrum, { props: { active: true } })
    expect(raf).toHaveBeenCalled()
  })

  it('is hidden from assistive tech', () => {
    const wrapper = mount(Spectrum, { props: { active: false } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })
})
