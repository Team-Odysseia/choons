import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Globe, Lock } from 'lucide-vue-next'
import SegmentedToggle from '../SegmentedToggle.vue'

const options = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Private', icon: Lock },
]

describe('SegmentedToggle', () => {
  it('clicking second option emits update:modelValue with its value', async () => {
    const wrapper = mount(SegmentedToggle, { props: { modelValue: 'public', options } })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['private'])
  })

  it('marks the selected option as on', () => {
    const wrapper = mount(SegmentedToggle, { props: { modelValue: 'private', options } })
    const buttons = wrapper.findAll('button')
    expect(buttons[1]!.attributes('data-state')).toBe('on')
    expect(buttons[0]!.attributes('data-state')).toBe('off')
  })
})
