import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SectionHeader from '../SectionHeader.vue'
import PageHeader from '../PageHeader.vue'
import Readout from '../Readout.vue'

describe('SectionHeader', () => {
  it('renders title, count and emits see-all', async () => {
    const wrapper = mount(SectionHeader, { props: { title: 'Recently Added', count: 24, seeAll: true } })
    expect(wrapper.find('h2').text()).toBe('Recently Added')
    expect(wrapper.text()).toContain('24')
    const see = wrapper.findAll('button').find((b) => b.text() === 'See all')
    await see!.trigger('click')
    expect(wrapper.emitted('see-all')).toHaveLength(1)
  })

  it('shows Show less when expanded', () => {
    const wrapper = mount(SectionHeader, { props: { title: 'Songs', seeAll: true, expanded: true } })
    expect(wrapper.text()).toContain('Show less')
  })

  it('arrows emit prev and next', async () => {
    const wrapper = mount(SectionHeader, { props: { title: 'Albums', arrows: true } })
    await wrapper.find('[aria-label="Previous"]').trigger('click')
    await wrapper.find('[aria-label="Next"]').trigger('click')
    expect(wrapper.emitted('prev')).toHaveLength(1)
    expect(wrapper.emitted('next')).toHaveLength(1)
  })
})

describe('PageHeader', () => {
  it('renders the title in an h1 with the kicker', () => {
    const wrapper = mount(PageHeader, { props: { kicker: 'SOURCE · LIBRARY', title: 'Library' } })
    expect(wrapper.find('h1').text()).toBe('Library')
    expect(wrapper.text()).toContain('SOURCE · LIBRARY')
  })
})

describe('Readout', () => {
  it('uses the segment font when seg is set', () => {
    const wrapper = mount(Readout, { props: { caption: 'Time', value: '03:42', seg: true } })
    expect(wrapper.find('[data-value]').classes()).toContain('font-seg')
    expect(wrapper.text()).toContain('03:42')
  })
})
