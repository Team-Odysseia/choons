import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatePlate from '../StatePlate.vue'

describe('StatePlate', () => {
  it('code is aria-hidden and message is a paragraph', () => {
    const wrapper = mount(StatePlate, { props: { code: 'NO DISC', message: 'No favorites yet.' } })
    expect(wrapper.find('[data-code]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('p').text()).toBe('No favorites yet.')
  })

  it('error kind renders the code in red', () => {
    const wrapper = mount(StatePlate, { props: { code: 'ERR 404', message: 'Not found', kind: 'error' } })
    expect(wrapper.find('[data-code]').classes()).toContain('text-red')
  })

  it('loading kind blinks the code', () => {
    const wrapper = mount(StatePlate, { props: { code: 'READING…', message: 'Loading', kind: 'loading' } })
    expect(wrapper.find('[data-code]').classes()).toContain('vfd-blink')
  })
})
