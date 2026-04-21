import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import AdminAlbumEditView from '../AdminAlbumEditView.vue'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

const mockGetAdminAlbum = vi.hoisted(() => vi.fn())
const mockUpdateAlbum = vi.hoisted(() => vi.fn())
const mockDeleteAlbumCover = vi.hoisted(() => vi.fn())
vi.mock('@/api/albums', () => ({
  getAdminAlbum: mockGetAdminAlbum,
  updateAlbum: mockUpdateAlbum,
  deleteAlbumCover: mockDeleteAlbumCover,
  albumImageUrl: (id: string) => `http://test/media/images/albums/${id}`,
}))

const mockGetArtists = vi.hoisted(() => vi.fn())
vi.mock('@/api/artists', () => ({
  getArtists: mockGetArtists,
  artistImageUrl: (id: string) => `http://test/media/images/artists/${id}`,
}))

const mockGetTracks = vi.hoisted(() => vi.fn())
const mockUpdateAlbumTracks = vi.hoisted(() => vi.fn())
const mockDeleteTrack = vi.hoisted(() => vi.fn())
const mockUploadTrack = vi.hoisted(() => vi.fn())
vi.mock('@/api/tracks', () => ({
  getTracks: mockGetTracks,
  updateAlbumTracks: mockUpdateAlbumTracks,
  deleteTrack: mockDeleteTrack,
  uploadTrack: mockUploadTrack,
}))

// Draggable stub that renders named slot #item for each modelValue entry
vi.mock('vuedraggable', () => ({
  default: {
    name: 'draggable',
    props: ['modelValue', 'itemKey', 'handle'],
    template: `
      <div>
        <template v-for="(item, index) in modelValue" :key="index">
          <slot name="item" :element="item" :index="index" />
        </template>
      </div>
    `,
  },
}))

// ImageUpload stub that exposes reset() so save() doesn't throw
const ImageUploadStub = {
  template: '<div data-stub="ImageUpload" />',
  props: ['currentUrl', 'label'],
  emits: ['select', 'remove'],
  methods: { reset() {} },
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const artist1 = { id: 'a-1', name: 'Radiohead', bio: null, createdAt: '2024-01-01T00:00:00Z', avatarUrl: null }
const artist2 = { id: 'a-2', name: 'Portishead', bio: null, createdAt: '2024-01-01T00:00:00Z', avatarUrl: null }

const baseAlbum = {
  id: 'al-1',
  title: 'OK Computer',
  artist: artist1,
  releaseYear: 1997,
  createdAt: '2024-01-01T00:00:00Z',
  coverUrl: null,
}

const track1 = { id: 't-1', title: 'Airbag', trackNumber: 1, durationSeconds: 278, album: baseAlbum, artist: artist1, createdAt: '2024-01-01T00:00:00Z' }
const track2 = { id: 't-2', title: 'Paranoid Android', trackNumber: 2, durationSeconds: 382, album: baseAlbum, artist: artist1, createdAt: '2024-01-01T00:00:00Z' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/albums/:id/edit', component: AdminAlbumEditView },
      { path: '/admin/albums', component: { template: '<div />' } },
    ],
  })
}

async function mountView(
  album = baseAlbum,
  tracks = [track1, track2],
  artists = [artist1, artist2],
) {
  const pinia = createPinia()
  setActivePinia(pinia)

  mockGetAdminAlbum.mockResolvedValue(album)
  mockGetArtists.mockResolvedValue(artists)
  mockGetTracks.mockResolvedValue(tracks)

  const router = makeRouter()
  await router.push(`/admin/albums/${album.id}/edit`)
  await router.isReady()

  const wrapper = mount(AdminAlbumEditView, {
    global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
  })

  await flushPromises()
  return { wrapper, router }
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('rendering', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows loading state before album loads', () => {
    mockGetAdminAlbum.mockReturnValue(new Promise(() => {}))
    mockGetArtists.mockResolvedValue([artist1])
    mockGetTracks.mockResolvedValue([])

    const pinia = createPinia()
    setActivePinia(pinia)
    const router = makeRouter()
    router.push('/admin/albums/al-1/edit')

    const wrapper = mount(AdminAlbumEditView, {
      global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
    })
    expect(wrapper.text()).toContain('Loading')
  })

  it('renders Edit Album heading after load', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Edit Album')
  })

  it('pre-fills title field with album title', async () => {
    const { wrapper } = await mountView()
    const inputValues = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(inputValues).toContain('OK Computer')
  })

  it('renders existing track titles in input fields', async () => {
    const { wrapper } = await mountView()
    const inputValues = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(inputValues).toContain('Airbag')
    expect(inputValues).toContain('Paranoid Android')
  })

  it('has a back button that navigates to /admin/albums', async () => {
    const { wrapper, router } = await mountView()
    const backBtn = wrapper.find('button')
    await backBtn.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/albums')
  })

  it('redirects to /admin/albums on load error', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mockGetAdminAlbum.mockRejectedValue(new Error('Not found'))
    mockGetArtists.mockResolvedValue([])
    mockGetTracks.mockResolvedValue([])

    const router = makeRouter()
    await router.push('/admin/albums/al-1/edit')
    await router.isReady()

    mount(AdminAlbumEditView, {
      global: { plugins: [pinia, router], stubs: { ImageUpload: ImageUploadStub } },
    })
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/admin/albums')
  })
})

// ─── Save ─────────────────────────────────────────────────────────────────────

describe('save', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calls updateAlbum with form data on submit', async () => {
    mockUpdateAlbum.mockResolvedValue(baseAlbum)
    mockUpdateAlbumTracks.mockResolvedValue([track1, track2])
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdateAlbum).toHaveBeenCalledWith('al-1', expect.any(FormData))
  })

  it('calls updateAlbumTracks when tracks exist', async () => {
    mockUpdateAlbum.mockResolvedValue(baseAlbum)
    mockUpdateAlbumTracks.mockResolvedValue([track1, track2])
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdateAlbumTracks).toHaveBeenCalledWith(
      'al-1',
      expect.arrayContaining([
        expect.objectContaining({ id: 't-1' }),
        expect.objectContaining({ id: 't-2' }),
      ]),
    )
  })

  it('does not call updateAlbumTracks when no tracks', async () => {
    mockUpdateAlbum.mockResolvedValue(baseAlbum)
    const { wrapper } = await mountView(baseAlbum, [])

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockUpdateAlbumTracks).not.toHaveBeenCalled()
  })

  it('shows success toast after saving', async () => {
    mockUpdateAlbum.mockResolvedValue(baseAlbum)
    mockUpdateAlbumTracks.mockResolvedValue([track1, track2])
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('OK Computer'))
  })

  it('shows error toast on save failure', async () => {
    mockUpdateAlbum.mockRejectedValue({ response: { data: { error: 'Save failed' } } })
    const { wrapper } = await mountView()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Save failed')
  })

  it('disables the save button while saving', async () => {
    let resolve!: (v: any) => void
    mockUpdateAlbum.mockReturnValue(new Promise((r) => { resolve = r }))
    mockUpdateAlbumTracks.mockResolvedValue([])
    const { wrapper } = await mountView(baseAlbum, [])

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()

    resolve(baseAlbum)
    await flushPromises()
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})

// ─── Track deletion ───────────────────────────────────────────────────────────

describe('track deletion', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('calls deleteTrack and removes track from list', async () => {
    mockDeleteTrack.mockResolvedValue(undefined)
    const { wrapper } = await mountView()

    // Delete buttons have type="button" and text-dimmed class
    const deleteButtons = wrapper
      .findAll('button[type="button"]')
      .filter((b) => b.attributes('class')?.includes('text-dimmed') && !b.text().includes('Back'))

    expect(deleteButtons.length).toBeGreaterThan(0)
    await deleteButtons[0]!.trigger('click')
    await flushPromises()

    expect(mockDeleteTrack).toHaveBeenCalledWith('t-1')
    const inputValues = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(inputValues).not.toContain('Airbag')
  })

  it('shows error toast if deleteTrack fails', async () => {
    mockDeleteTrack.mockRejectedValue(new Error('fail'))
    const { wrapper } = await mountView()

    const deleteButtons = wrapper
      .findAll('button[type="button"]')
      .filter((b) => b.attributes('class')?.includes('text-dimmed') && !b.text().includes('Back'))

    await deleteButtons[0]!.trigger('click')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Failed to delete track')
  })
})
