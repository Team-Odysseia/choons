import { afterEach, describe, expect, it } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import BaseDialog from '../BaseDialog.vue'
import source from '../BaseDialog.vue?raw'

let wrapper: VueWrapper | undefined

function mountDialog(open = true) {
  wrapper = mount(BaseDialog, {
    props: { open, title: 'Delete playlist' },
    slots: { default: '<p>Body</p><button>Inside</button>' },
    attachTo: document.body,
  })
  return wrapper
}

describe('BaseDialog', () => {
  afterEach(() => {
    wrapper?.unmount()
    document.body.innerHTML = ''
  })

  it('renders title in heading', async () => {
    mountDialog()
    await flushPromises()
    const heading = document.body.querySelector('[role="dialog"] h2')
    expect(heading?.textContent).toBe('Delete playlist')
  })

  it('Escape emits close', async () => {
    const w = mountDialog()
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]')
    dialog?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(w.emitted('close')).toBeTruthy()
  })

  it('focus moves into dialog on open', async () => {
    mountDialog()
    await flushPromises()
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.contains(document.activeElement)).toBe(true)
  })

  it('close key emits close', async () => {
    const w = mountDialog()
    await flushPromises()
    const close = document.body.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')
    close?.click()
    await flushPromises()
    expect(w.emitted('close')).toBeTruthy()
  })

  it('renders nothing when closed', async () => {
    mountDialog(false)
    await flushPromises()
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('entrance keyframes only scale, never re-translate (Tailwind centres via the translate property)', () => {
    const keyframes = source.slice(source.indexOf('@keyframes vfd-dialog-in'))
    const block = keyframes.slice(0, keyframes.indexOf('\n}\n') + 2)
    expect(block).toContain('scale')
    expect(block).not.toMatch(/translate/)
  })
})
