import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AdminArtistEditView from '../AdminArtistEditView.vue'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

const mockGetAdminArtist = vi.hoisted(() => vi.fn())
const mockUpdateArtist = vi.hoisted(() => vi.fn())
const mockDeleteArtistAvatar = vi.hoisted(() => vi.fn())
vi.mock('@/api/artists', () => ({
  getAdminArtist: mockGetAdminArtist,
  updateArtist: mockUpdateArtist,
  deleteArtistAvatar: mockDeleteArtistAvatar,
  artistImageUrl: (id: string) => `http://test/media/images/artists/${id}`,
}))

// ImageUpload stub that exposes a reset() method (needed by save())
const ImageUploadStub = {
  template: '<div data-stub="ImageUpload" />',
  props: ['currentUrl', 'label'],
  emits: ['select', 'remove'],
  methods: { reset() {} },
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseArtist = {
  id: 'a-1',
  name: 'The Beatles',
  bio: 'A great band',
  createdAt: '2024-01-01T00:00:00Z',
  avatarUrl: null,
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/artists/:id/edit', component: AdminArtistEditView },
      { path: '/admin/artists', component: { template: '<div />' } },
    ],
  })
}

async function mountView(artist = baseArtist, id = 'a-1') {
  const pinia = createPinia()
  setActivePinia(pinia)

  mockGetAdminArtist.mockResolvedValue(artist)

  const router = makeRouter()
  await router.push(`/admin/artists/${id}/edit`)
  await router.isReady()

  const wrapper = mount(AdminArtistEditView, {
    global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
  })

  await flushPromises()
  return { wrapper, router }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows loading state before artist loads', () => {
    mockGetAdminArtist.mockReturnValue(new Promise(() => {}))
    const pinia = createPinia()
    setActivePinia(pinia)

    const router = makeRouter()
    router.push('/admin/artists/a-1/edit')

    const wrapper = mount(AdminArtistEditView, {
      global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
    })
    expect(wrapper.text()).toContain('Loading')
  })

  it('renders the Edit Artist heading after load', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Edit Artist')
  })

  it('pre-fills name field with artist name', async () => {
    const { wrapper } = await mountView()
    const inputs = wrapper.findAll('input')
    const values = inputs.map((i) => (i.element as HTMLInputElement).value)
    expect(values).toContain('The Beatles')
  })

  it('has a back button that navigates to /admin/artists', async () => {
    const { wrapper, router } = await mountView()
    // The first button is the back arrow button
    const backBtn = wrapper.find('button')
    await backBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/artists')
  })

  it('redirects to /admin/artists on load error', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mockGetAdminArtist.mockRejectedValue(new Error('Not found'))

    const router = makeRouter()
    await router.push('/admin/artists/a-1/edit')
    await router.isReady()

    mount(AdminArtistEditView, {
      global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
    })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/artists')
  })
})

// ─── Save ─────────────────────────────────────────────────────────────────────

describe('save', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calls updateArtist with form data on submit', async () => {
    mockUpdateArtist.mockResolvedValue({ ...baseArtist })
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdateArtist).toHaveBeenCalledWith('a-1', expect.any(FormData))
  })

  it('shows success toast after saving', async () => {
    mockUpdateArtist.mockResolvedValue({ ...baseArtist, name: 'The Beatles' })
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('The Beatles'))
  })

  it('shows error toast on save failure', async () => {
    mockUpdateArtist.mockRejectedValue({ response: { data: { error: 'Server error' } } })
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Server error')
  })

  it('calls deleteArtistAvatar when image was removed and no new file selected', async () => {
    mockDeleteArtistAvatar.mockResolvedValue(undefined)
    mockUpdateArtist.mockResolvedValue({ ...baseArtist })

    const pinia = createPinia()
    setActivePinia(pinia)
    mockGetAdminArtist.mockResolvedValue({ ...baseArtist, avatarUrl: '/avatar.jpg' })

    const router = makeRouter()
    await router.push('/admin/artists/a-1/edit')
    await router.isReady()

    // Stub that emits 'remove' via an accessible button
    const ImageUploadWithRemoveStub = {
      template: '<div><button type="button" data-remove @click="$emit(\'remove\')">Remove</button></div>',
      props: ['currentUrl', 'label'],
      emits: ['select', 'remove'],
      methods: { reset() {} },
    }

    const wrapper = mount(AdminArtistEditView, {
      global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadWithRemoveStub } },
    })
    await flushPromises()

    await wrapper.find('[data-remove]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockDeleteArtistAvatar).toHaveBeenCalledWith('a-1')
  })

  it('disables the save button while saving', async () => {
    let resolve!: (v: any) => void
    mockUpdateArtist.mockReturnValue(new Promise((r) => { resolve = r }))
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()

    resolve(baseArtist)
    await flushPromises()
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})
