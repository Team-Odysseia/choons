import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Inbox } from 'lucide-vue-next'
import SourceButton from '../SourceButton.vue'

describe('SourceButton', () => {
  it('renders its label inside a bouncing marquee', () => {
    const wrapper = mount(SourceButton, { props: { icon: Inbox, label: 'Album Requests', active: false } })
    const marquee = wrapper.find('.vfd-marquee')
    expect(marquee.exists()).toBe(true)
    expect(marquee.text()).toBe('Album Requests')
  })

  it('marks the active source', () => {
    const wrapper = mount(SourceButton, { props: { icon: Inbox, label: 'Library', active: true } })
    expect(wrapper.attributes('data-active')).toBeDefined()
    expect(wrapper.attributes('aria-current')).toBe('page')
  })
})
