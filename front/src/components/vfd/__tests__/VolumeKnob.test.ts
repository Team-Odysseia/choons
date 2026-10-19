import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VolumeKnob from '../VolumeKnob.vue'

describe('VolumeKnob', () => {
  it('ArrowUp increases value by 0.01', async () => {
    const wrapper = mount(VolumeKnob, { props: { modelValue: 0.5 }, attachTo: document.body })
    await wrapper.find('[role="slider"]').trigger('keydown', { key: 'ArrowUp' })
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted?.slice(-1)[0]?.[0]).toBeCloseTo(0.51, 5)
    wrapper.unmount()
  })

  it('End sets 1', async () => {
    const wrapper = mount(VolumeKnob, { props: { modelValue: 0.2 }, attachTo: document.body })
    await wrapper.find('[role="slider"]').trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0]).toBe(1)
    wrapper.unmount()
  })

  it('lit arc sweep reflects value', () => {
    const wrapper = mount(VolumeKnob, { props: { modelValue: 0.5 } })
    expect(wrapper.find('[data-knob]').attributes('style')).toContain('--sweep: 135deg')
    expect(wrapper.text()).toContain('50')
  })

  it('wheel up raises the volume by 0.05', async () => {
    const wrapper = mount(VolumeKnob, { props: { modelValue: 0.5 } })
    await wrapper.find('[data-knob]').trigger('wheel', { deltaY: -100 })
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0]).toBeCloseTo(0.55, 5)
  })

  it('marks the knob as focused while its slider has keyboard focus', async () => {
    const wrapper = mount(VolumeKnob, { props: { modelValue: 0.5 }, attachTo: document.body })
    const knob = wrapper.find('[data-knob]')
    expect(knob.attributes('data-focused')).toBeUndefined()
    await wrapper.find('[role="slider"]').trigger('focusin')
    expect(knob.attributes('data-focused')).toBeDefined()
    expect(knob.classes()).toContain('knob-focus')
    await wrapper.find('[role="slider"]').trigger('focusout')
    expect(knob.attributes('data-focused')).toBeUndefined()
    wrapper.unmount()
  })
})
