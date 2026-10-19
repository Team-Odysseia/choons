import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dialogStubs } from '@/test-utils/dialog'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { httpError } from '@/test-utils/http'
import AdminListenersView from '../AdminListenersView.vue'

const api = vi.hoisted(() => ({
  getListeners: vi.fn(),
  registerListener: vi.fn(),
  updateListener: vi.fn(),
  deleteListener: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/auth', () => api)
vi.mock('vue-sonner', () => ({ toast: toastMock }))

const bob = { id: 'u-bob', username: 'bob', requestsBlocked: false }
const amy = { id: 'u-amy', username: 'amy', requestsBlocked: true }

async function mountView() {
  const wrapper = mount(AdminListenersView, { global: { stubs: dialogStubs } })
  await flushPromises()
  return wrapper
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>, label: string) {
  return wrapper.findAll('button').find((b) => b.text() === label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  api.getListeners.mockResolvedValue([bob, amy])
})

describe('AdminListenersView', () => {
  it('lists listeners with their block state', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('h1').text()).toBe('Listeners (2)')
    expect(wrapper.text()).toContain('bob')
    expect(wrapper.text()).toContain('Blocked')
  })

  it('searches by username and clears the search', async () => {
    const wrapper = await mountView()

    await wrapper.find('input[placeholder="Search listener by username"]').setValue('  bo ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(api.getListeners).toHaveBeenLastCalledWith('bo')

    await button(wrapper, 'Clear')!.trigger('click')
    await flushPromises()
    expect(api.getListeners).toHaveBeenLastCalledWith(undefined)
  })

  it('creates a listener and reloads', async () => {
    api.registerListener.mockResolvedValue({ id: 'u-new', username: 'new', role: 'LISTENER' })
    const wrapper = await mountView()

    await button(wrapper, 'Add Listener')!.trigger('click')
    await wrapper.find('#username').setValue('new')
    await wrapper.find('#password').setValue('secret123')
    await wrapper.find('#username').element.closest('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(api.registerListener).toHaveBeenCalledWith('new', 'secret123')
    expect(toastMock.success).toHaveBeenCalledWith('Listener "new" created successfully')
    expect(api.getListeners).toHaveBeenCalledTimes(2)
  })

  it('shows the password policy error from the server', async () => {
    api.registerListener.mockRejectedValue(httpError(400, 'password size must be between 6 and 160'))
    const wrapper = await mountView()

    await button(wrapper, 'Add Listener')!.trigger('click')
    await wrapper.find('#username').setValue('new')
    await wrapper.find('#password').setValue('x')
    await wrapper.find('#username').element.closest('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('password size must be between 6 and 160')
  })

  it('renames a listener', async () => {
    api.updateListener.mockResolvedValue({ ...bob, username: 'robert' })
    const wrapper = await mountView()

    await wrapper.findAll('button[title="Edit listener"]')[0]!.trigger('click')
    await wrapper.find('#edit-username').setValue(' robert ')
    await wrapper.find('#edit-username').element.closest('form')!.dispatchEvent(new Event('submit'))
    await flushPromises()

    expect(api.updateListener).toHaveBeenCalledWith('u-bob', 'robert', '')
    expect(wrapper.text()).toContain('robert')
  })

  it('deletes a listener after confirmation', async () => {
    api.deleteListener.mockResolvedValue(undefined)
    const wrapper = await mountView()

    await wrapper.findAll('button[title="Delete listener"]')[1]!.trigger('click')
    await button(wrapper, 'Delete')!.trigger('click')
    await flushPromises()

    expect(api.deleteListener).toHaveBeenCalledWith('u-amy')
    expect(wrapper.find('h1').text()).toBe('Listeners (1)')
  })

  it('reports a failed load', async () => {
    api.getListeners.mockRejectedValue(httpError(500))
    await mountView()
    expect(toastMock.error).toHaveBeenCalledWith('Failed to load listeners')
  })
})
