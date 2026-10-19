import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Heart } from 'lucide-vue-next'
import IconKey from '../IconKey.vue'

describe('IconKey', () => {
  it('uses label as aria-label', () => {
    const wrapper = mount(IconKey, { props: { icon: Heart, label: 'Add to favorites' } })
    expect(wrapper.attributes('aria-label')).toBe('Add to favorites')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('lit adds glow-sm', () => {
    const wrapper = mount(IconKey, { props: { icon: Heart, label: 'Fav', lit: true } })
    expect(wrapper.classes()).toContain('glow-sm')
    expect(wrapper.classes()).toContain('text-cyan')
  })

  it('emits click unless disabled', async () => {
    const wrapper = mount(IconKey, { props: { icon: Heart, label: 'Fav', disabled: true } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
    await wrapper.setProps({ disabled: false })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
