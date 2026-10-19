import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LedBar from '../LedBar.vue'

describe('LedBar', () => {
  it('lit segment count = round(value*segments)', () => {
    const wrapper = mount(LedBar, { props: { value: 0.4, segments: 20 } })
    expect(wrapper.findAll('[data-seg]')).toHaveLength(20)
    expect(wrapper.findAll('[data-seg][data-lit]')).toHaveLength(8)
  })

  it('scales against max', () => {
    const wrapper = mount(LedBar, { props: { value: 30, max: 120, segments: 40 } })
    expect(wrapper.findAll('[data-seg][data-lit]')).toHaveLength(10)
  })

  it('interactive emits update and commit on keyboard step', async () => {
    const wrapper = mount(LedBar, {
      props: { value: 50, max: 100, interactive: true, label: 'Seek' },
      attachTo: document.body,
    })
    const thumb = wrapper.find('[role="slider"]')
    expect(thumb.attributes('aria-label')).toBe('Seek')
    await thumb.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:value')?.slice(-1)[0]?.[0]).toBe(51)
    expect(wrapper.emitted('commit')?.slice(-1)[0]?.[0]).toBe(51)
    wrapper.unmount()
  })

  it('vertical orientation renders a vertical slider', () => {
    const wrapper = mount(LedBar, { props: { value: 0.5, interactive: true, orientation: 'vertical', label: 'Volume' } })
    expect(wrapper.find('[role="slider"]').attributes('aria-orientation')).toBe('vertical')
  })
})
