import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VfdBadge from '../VfdBadge.vue'
import CountBadge from '../CountBadge.vue'

describe('VfdBadge', () => {
  it('tone red renders text-red and led-red', () => {
    const wrapper = mount(VfdBadge, { props: { tone: 'red', label: 'Blocked' } })
    expect(wrapper.classes()).toContain('text-red')
    expect(wrapper.find('[data-led]').classes()).toContain('led-red')
    expect(wrapper.text()).toBe('Blocked')
  })

  it('hides the LED when led=false', () => {
    const wrapper = mount(VfdBadge, { props: { tone: 'amber', label: 'HI-FI', led: false } })
    expect(wrapper.find('[data-led]').exists()).toBe(false)
  })
})

describe('CountBadge', () => {
  it('renders the count', () => {
    const wrapper = mount(CountBadge, { props: { count: 3 } })
    expect(wrapper.text()).toBe('3')
  })

  it('renders nothing when count is 0', () => {
    const wrapper = mount(CountBadge, { props: { count: 0 } })
    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
