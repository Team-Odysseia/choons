import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioDropZone from '../AudioDropZone.vue'

function audioFile(name = 'song.mp3') {
  return new File(['x'], name, { type: 'audio/mpeg' })
}

describe('AudioDropZone', () => {
  it('emits files on drop and clears the active state', async () => {
    const wrapper = mount(AudioDropZone)
    const zone = wrapper.find('[data-dropzone]')
    await zone.trigger('dragover')
    expect(zone.attributes('data-active')).toBeDefined()
    const file = audioFile()
    await zone.trigger('drop', { dataTransfer: { files: [file] } })
    expect(wrapper.emitted('files')?.[0]).toEqual([[file]])
    expect(zone.attributes('data-active')).toBeUndefined()
  })

  it('emits files picked from the file input', async () => {
    const wrapper = mount(AudioDropZone)
    const input = wrapper.find('input[type="file"]')
    const file = audioFile('b.flac')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(wrapper.emitted('files')?.[0]).toEqual([[file]])
  })

  it('shows the given title', () => {
    const wrapper = mount(AudioDropZone, { props: { title: 'Add more tracks' } })
    expect(wrapper.text()).toContain('Add more tracks')
    expect(wrapper.text()).toContain('MP3, FLAC, OGG, WAV, AAC')
  })
})
