import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { dialogStubs } from '@/test-utils/dialog'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { httpError } from '@/test-utils/http'
import { makeArtist } from '@/test-utils/fixtures'
import AdminArtistsView from '../AdminArtistsView.vue'

const api = vi.hoisted(() => ({
  getAdminArtists: vi.fn(),
  searchArtists: vi.fn(),
  createArtist: vi.fn(),
  deleteArtist: vi.fn(),
}))
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/artists', () => ({ ...api, artistImageUrl: (id: string) => `/media/images/artists/${id}` }))
vi.mock('vue-sonner', () => ({ toast: toastMock }))

const ImageUploadStub = { template: '<div />', methods: { reset() {} } }

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/artists', component: AdminArtistsView },
      { path: '/admin/artists/:id/edit', component: { template: '<div />' } },
    ],
  })
  await router.push('/admin/artists')
  const wrapper = mount(AdminArtistsView, {
    global: { plugins: [router], stubs: { ...dialogStubs, ImageUpload: ImageUploadStub } },
  })
  await flushPromises()
  return { wrapper, router }
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  api.getAdminArtists.mockResolvedValue([makeArtist(), makeArtist({ id: 'ar-2', name: 'Aphex Twin' })])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AdminArtistsView', () => {
  it('loads every artist from the unpaged admin endpoint', async () => {
    const { wrapper } = await mountView()
    expect(api.getAdminArtists).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Burial')
    expect(wrapper.text()).toContain('Aphex Twin')
  })

  it('searches after typing stops', async () => {
    api.searchArtists.mockResolvedValue([makeArtist()])
    const { wrapper } = await mountView()
    vi.useFakeTimers()

    await wrapper.find('input[placeholder="Search artist by name"]').setValue('bur')
    vi.advanceTimersByTime(250)
    vi.useRealTimers()
    await flushPromises()

    expect(api.searchArtists).toHaveBeenCalledWith('bur', 0, 200)
    expect(wrapper.text()).not.toContain('Aphex Twin')
  })

  it('opens the editor', async () => {
    const { wrapper, router } = await mountView()
    await wrapper.findAll('button[title="Edit"]')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/artists/ar-1/edit')
  })

  it('creates an artist', async () => {
    api.createArtist.mockResolvedValue(makeArtist({ id: 'ar-3', name: 'Kode9' }))
    const { wrapper } = await mountView()

    await button(wrapper, 'Add Artist')!.trigger('click')
    const form = wrapper.find('form.admin-form')
    await form.find('input').setValue('Kode9')
    await form.trigger('submit')
    await flushPromises()

    expect(api.createArtist).toHaveBeenCalledWith('Kode9', '', null)
    expect(toastMock.success).toHaveBeenCalledWith('Artist "Kode9" created successfully')
  })

  it('reports a duplicate artist name', async () => {
    api.createArtist.mockRejectedValue(httpError(409, 'Artist already exists'))
    const { wrapper } = await mountView()

    await button(wrapper, 'Add Artist')!.trigger('click')
    const form = wrapper.find('form.admin-form')
    await form.find('input').setValue('Burial')
    await form.trigger('submit')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('Artist already exists')
  })

  it('deletes after confirmation', async () => {
    api.deleteArtist.mockResolvedValue(undefined)
    const { wrapper } = await mountView()

    await wrapper.findAll('button[title="Delete"]')[1]!.trigger('click')
    await button(wrapper, 'Delete')!.trigger('click')
    await flushPromises()

    expect(api.deleteArtist).toHaveBeenCalledWith('ar-2')
    expect(toastMock.success).toHaveBeenCalledWith('"Aphex Twin" deleted')
  })

  it('reports a failed load', async () => {
    api.getAdminArtists.mockRejectedValue(httpError(500))
    await mountView()
    expect(toastMock.error).toHaveBeenCalledWith('Failed to load artists')
  })
})
