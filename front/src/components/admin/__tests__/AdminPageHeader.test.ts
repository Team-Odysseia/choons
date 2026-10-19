import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminPageHeader from '../AdminPageHeader.vue'

describe('AdminPageHeader', () => {
  it('renders the title as h1 and a padded total readout', () => {
    const wrapper = mount(AdminPageHeader, { props: { kicker: 'Admin · Artists', title: 'Artists (7)', total: 7 } })
    expect(wrapper.find('h1').text()).toBe('Artists (7)')
    expect(wrapper.find('[data-testid="total-readout"]').text()).toContain('007')
  })

  it('emits add from the add key', async () => {
    const wrapper = mount(AdminPageHeader, { props: { kicker: 'k', title: 't', addLabel: 'Add Artist' } })
    await wrapper.findAll('button').find((b) => b.text() === 'Add Artist')!.trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('hides the add key without a label', () => {
    const wrapper = mount(AdminPageHeader, { props: { kicker: 'k', title: 't' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
