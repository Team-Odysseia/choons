import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageUpload from '../ImageUpload.vue'

// ─── URL helpers ──────────────────────────────────────────────────────────────

const fakeObjectUrl = 'blob:fake-url'
const mockCreateObjectURL = vi.fn().mockReturnValue(fakeObjectUrl)
const mockRevokeObjectURL = vi.fn()

Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true })
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true })

// Reset mocks before each test to avoid Once-value queue leaks between tests
beforeEach(() => {
  vi.resetAllMocks()
  mockCreateObjectURL.mockReturnValue(fakeObjectUrl)
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', type = 'image/jpeg') {
  return new File(['data'], name, { type })
}

function mountUpload(props: Record<string, unknown> = {}) {
  return mount(ImageUpload, { props })
}

function setFiles(input: ReturnType<typeof import('@vue/test-utils').DOMWrapper.prototype.find>, files: File[]) {
  Object.defineProperty(input.element, 'files', { value: files, configurable: true, writable: false })
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  it('shows label when provided', () => {
    const wrapper = mountUpload({ label: 'Avatar' })
    expect(wrapper.text()).toContain('Avatar')
  })

  it('does not show label when not provided', () => {
    const wrapper = mountUpload()
    // The label <span> has class font-medium; other spans in the component don't
    expect(wrapper.find('span.font-medium').exists()).toBe(false)
  })

  it('shows current image when currentUrl is provided', () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/avatar.jpg')
  })

  it('does not show image when no currentUrl', () => {
    const wrapper = mountUpload()
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows "Upload image" text when no image present', () => {
    const wrapper = mountUpload()
    expect(wrapper.text()).toContain('Upload image')
  })

  it('shows "Replace image" text when image is present', () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    expect(wrapper.text()).toContain('Replace image')
  })

  it('shows remove button when image is present', () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    expect(wrapper.find('[aria-label="Remove image"]').exists()).toBe(true)
  })

  it('does not show remove button when no image', () => {
    const wrapper = mountUpload()
    expect(wrapper.find('[aria-label="Remove image"]').exists()).toBe(false)
  })
})

// ─── File selection ───────────────────────────────────────────────────────────

describe('file selection', () => {
  it('emits select with the chosen file', async () => {
    const wrapper = mountUpload()
    const file = makeFile()
    const input = wrapper.find('input[type="file"]')
    setFiles(input, [file])
    await input.trigger('change')
    const emitted = wrapper.emitted('select')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toBe(file)
  })

  it('creates object URL for preview after file selected', async () => {
    const wrapper = mountUpload()
    const file = makeFile()
    const input = wrapper.find('input[type="file"]')
    setFiles(input, [file])
    await input.trigger('change')
    await wrapper.vm.$nextTick()
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file)
    expect(wrapper.find('img').attributes('src')).toBe(fakeObjectUrl)
  })

  it('replaces preview when a second file is selected', async () => {
    mockCreateObjectURL.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
    const wrapper = mountUpload()

    const input = wrapper.find('input[type="file"]')
    const file1 = makeFile('a.jpg')
    setFiles(input, [file1])
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    const file2 = makeFile('b.jpg')
    setFiles(input, [file2])
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:first')
    expect(wrapper.find('img').attributes('src')).toBe('blob:second')
  })
})

// ─── Remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('emits remove when clicking the remove button', async () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    await wrapper.find('[aria-label="Remove image"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeTruthy()
  })

  it('hides the image after clicking remove', async () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    await wrapper.find('[aria-label="Remove image"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows "Upload image" after removing', async () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    await wrapper.find('[aria-label="Remove image"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Upload image')
  })
})

// ─── reset() ─────────────────────────────────────────────────────────────────

describe('reset()', () => {
  it('restores currentUrl display after reset', async () => {
    const wrapper = mountUpload({ currentUrl: 'https://example.com/avatar.jpg' })
    await wrapper.find('[aria-label="Remove image"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img').exists()).toBe(false)

    ;(wrapper.vm as any).reset()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/avatar.jpg')
  })

  it('revokes object URL on reset if preview exists', async () => {
    mockCreateObjectURL.mockReturnValue('blob:preview')

    const wrapper = mountUpload()
    const file = makeFile()
    const input = wrapper.find('input[type="file"]')
    setFiles(input, [file])
    await input.trigger('change')
    await wrapper.vm.$nextTick()

    ;(wrapper.vm as any).reset()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})

// ─── Drag and drop ────────────────────────────────────────────────────────────

describe('drag and drop', () => {
  it('emits select when an image file is dropped', async () => {
    const wrapper = mountUpload()
    const file = makeFile()
    const dropZone = wrapper.find('[class*="border-dashed"]')
    await dropZone.trigger('drop', {
      dataTransfer: { files: [file] },
    })
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0][0]).toBe(file)
  })

  it('does not emit select when dropped file is not an image', async () => {
    const wrapper = mountUpload()
    const file = new File(['data'], 'song.mp3', { type: 'audio/mpeg' })
    const dropZone = wrapper.find('[class*="border-dashed"]')
    await dropZone.trigger('drop', {
      dataTransfer: { files: [file] },
    })
    expect(wrapper.emitted('select')).toBeFalsy()
  })

  it('applies drag-over styling when file is dragged over', async () => {
    const wrapper = mountUpload()
    const dropZone = wrapper.find('[class*="border-dashed"]')
    await dropZone.trigger('dragover')
    expect(dropZone.classes().join(' ')).toContain('border-primary')
  })

  it('removes drag-over styling when file is dragged out', async () => {
    const wrapper = mountUpload()
    const dropZone = wrapper.find('[class*="border-dashed"]')
    await dropZone.trigger('dragover')
    await dropZone.trigger('dragleave')
    expect(dropZone.classes().join(' ')).not.toContain('border-primary')
  })
})
