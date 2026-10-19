import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button', () => {
  it('renders LED dot for default variant', () => {
    const wrapper = mount(Button, { slots: { default: 'Play all' } })
    const led = wrapper.find('[data-led]')
    expect(led.exists()).toBe(true)
    expect(led.classes()).toContain('led-on')
    expect(wrapper.text()).toBe('Play all')
  })

  it('no LED when led=false', () => {
    const wrapper = mount(Button, { props: { led: false }, slots: { default: 'Go' } })
    expect(wrapper.find('[data-led]').exists()).toBe(false)
  })

  it('ghost variant has no LED by default', () => {
    const wrapper = mount(Button, { props: { variant: 'ghost' }, slots: { default: 'Cancel' } })
    expect(wrapper.find('[data-led]').exists()).toBe(false)
  })

  it('destructive has text-red', () => {
    const wrapper = mount(Button, { props: { variant: 'destructive' }, slots: { default: 'Delete' } })
    expect(wrapper.classes()).toContain('text-red')
    expect(wrapper.find('[data-led]').classes()).toContain('led-red')
  })

  it('disabled sets disabled attr and no glow class', () => {
    const wrapper = mount(Button, { props: { disabled: true }, slots: { default: 'Next' } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).not.toContain('glow-sm')
    expect(wrapper.find('[data-led]').classes()).not.toContain('led-on')
  })
})
