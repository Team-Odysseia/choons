import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dialogStubs } from '@/test-utils/dialog'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { httpError } from '@/test-utils/http'
import { makeAlbum, makeArtist } from '@/test-utils/fixtures'
import AdminAlbumsView from '../AdminAlbumsView.vue'

const albumsApi = vi.hoisted(() => ({
  getAdminAlbums: vi.fn(),
  searchAlbums: vi.fn(),
  createAlbum: vi.fn(),
  deleteAlbum: vi.fn(),
}))
const getAdminArtists = vi.hoisted(() => vi.fn())
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/api/albums', () => ({ ...albumsApi, albumImageUrl: (id: string) => `/media/images/albums/${id}` }))
vi.mock('@/api/artists', () => ({ getAdminArtists }))
vi.mock('@/api/tracks', () => ({ uploadTrack: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast: toastMock }))
vi.mock('vuedraggable', () => ({
  default: { name: 'draggable', props: ['modelValue'], template: '<div />' },
}))

const ImageUploadStub = { template: '<div />', methods: { reset() {} } }

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/albums', component: AdminAlbumsView },
      { path: '/admin/albums/:id/edit', component: { template: '<div />' } },
    ],
  })
  await router.push('/admin/albums')
  const wrapper = mount(AdminAlbumsView, {
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
  getAdminArtists.mockResolvedValue([makeArtist(), makeArtist({ id: 'ar-2', name: 'Aphex Twin' })])
  albumsApi.getAdminAlbums.mockResolvedValue([makeAlbum(), makeAlbum({ id: 'al-2', title: 'Syro' })])
})

describe('AdminAlbumsView', () => {
  it('loads albums and the artist picker from the admin endpoints', async () => {
    const { wrapper } = await mountView()
    expect(albumsApi.getAdminAlbums).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Syro')
    await button(wrapper, 'Add Album')!.trigger('click')
    expect(wrapper.findAll('option').map((o) => o.text())).toEqual(['Select artist…', 'Burial', 'Aphex Twin'])
  })

  it('creates an album without tracks', async () => {
    albumsApi.createAlbum.mockResolvedValue(makeAlbum({ id: 'al-3', title: 'Kindred' }))
    const { wrapper } = await mountView()

    await button(wrapper, 'Add Album')!.trigger('click')
    const form = wrapper.find('form.create-layout')
    await form.find('input').setValue('Kindred')
    await form.find('select').setValue('ar-1')
    await form.trigger('submit')
    await flushPromises()

    expect(albumsApi.createAlbum).toHaveBeenCalledWith('Kindred', 'ar-1', new Date().getFullYear(), null)
    expect(toastMock.success).toHaveBeenCalledWith('Album "Kindred" created')
  })

  it('reports an oversized upload', async () => {
    albumsApi.createAlbum.mockRejectedValue(httpError(413, 'Maximum upload size exceeded'))
    const { wrapper } = await mountView()

    await button(wrapper, 'Add Album')!.trigger('click')
    const form = wrapper.find('form.create-layout')
    await form.find('input').setValue('Kindred')
    await form.find('select').setValue('ar-1')
    await form.trigger('submit')
    await flushPromises()

    expect(toastMock.error).toHaveBeenCalledWith('Maximum upload size exceeded')
  })

  it('deletes after confirmation', async () => {
    albumsApi.deleteAlbum.mockResolvedValue(undefined)
    const { wrapper } = await mountView()

    await wrapper.findAll('button[title="Delete"]')[1]!.trigger('click')
    await button(wrapper, 'Delete')!.trigger('click')
    await flushPromises()

    expect(albumsApi.deleteAlbum).toHaveBeenCalledWith('al-2')
    expect(toastMock.success).toHaveBeenCalledWith('"Syro" deleted')
  })

  it('reports a failed load', async () => {
    albumsApi.getAdminAlbums.mockRejectedValue(httpError(500))
    await mountView()
    expect(toastMock.error).toHaveBeenCalledWith('Failed to load albums')
  })
})
