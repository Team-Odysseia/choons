import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CoverArt from '../CoverArt.vue'

describe('CoverArt', () => {
  it('renders the image when src is given', () => {
    const wrapper = mount(CoverArt, { props: { src: '/cover.jpg', alt: 'Neon Highway' } })
    expect(wrapper.find('img').attributes('alt')).toBe('Neon Highway')
    expect(wrapper.find('[data-placeholder]').exists()).toBe(false)
  })

  it('shows placeholder on error', async () => {
    const wrapper = mount(CoverArt, { props: { src: '/missing.jpg', alt: 'Missing' } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-placeholder]').exists()).toBe(true)
  })

  it('shows placeholder without src', () => {
    const wrapper = mount(CoverArt, { props: { alt: 'None' } })
    expect(wrapper.find('[data-placeholder]').exists()).toBe(true)
  })
})
