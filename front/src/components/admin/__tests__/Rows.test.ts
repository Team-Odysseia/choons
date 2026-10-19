import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AdminRow from '../AdminRow.vue'
import EditTrackRow from '../EditTrackRow.vue'

describe('AdminRow', () => {
  it('emits delete on trash key', async () => {
    const wrapper = mount(AdminRow, { props: { primary: 'marta', secondary: 'id 7f3a' } })
    await wrapper.find('[aria-label="Delete"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('emits edit on pencil key', async () => {
    const wrapper = mount(AdminRow, { props: { primary: 'marta' } })
    await wrapper.find('[aria-label="Edit"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('disables the delete key while deleting', () => {
    const wrapper = mount(AdminRow, { props: { primary: 'x', deleting: true } })
    expect(wrapper.find('[aria-label="Delete"]').attributes('disabled')).toBeDefined()
  })

  it('shows Blocked badge when blocked', () => {
    expect(mount(AdminRow, { props: { primary: 'x' } }).text()).not.toContain('Blocked')
    expect(mount(AdminRow, { props: { primary: 'x', blocked: true } }).text()).toContain('Blocked')
  })
})

describe('EditTrackRow', () => {
  it('emits update:title on input', async () => {
    const wrapper = mount(EditTrackRow, { props: { index: 0, title: 'Night Signal' } })
    const input = wrapper.find('input[data-testid="track-title-input"]')
    await input.setValue('Night Signal (Remaster)')
    expect(wrapper.emitted('update:title')?.[0]).toEqual(['Night Signal (Remaster)'])
  })

  it('emits remove from the remove key', async () => {
    const wrapper = mount(EditTrackRow, { props: { index: 2, title: 'x' } })
    expect(wrapper.text()).toContain('03')
    await wrapper.find('[aria-label="Remove track"]').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('emits update:lyricsId as a number when lyrics shown', async () => {
    const wrapper = mount(EditTrackRow, { props: { index: 0, title: 'x', showLyrics: true, lyricsId: null } })
    await wrapper.find('input[data-testid="track-lyrics-input"]').setValue('7214')
    expect(wrapper.emitted('update:lyricsId')?.[0]).toEqual([7214])
  })

  it('renders the drag handle class used by vuedraggable', () => {
    const wrapper = mount(EditTrackRow, { props: { index: 0, title: 'x' } })
    expect(wrapper.find('.drag-handle').exists()).toBe(true)
  })
})
