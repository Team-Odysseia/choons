import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AlbumRequestsView from '../AlbumRequestsView.vue'

const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

const mockListMine = vi.hoisted(() => vi.fn())
const mockCreate = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())

vi.mock('@/api/albumRequests', () => ({
  listMyAlbumRequests: () => mockListMine(),
  createAlbumRequest: (payload: unknown) => mockCreate(payload),
  deleteAlbumRequest: (id: string) => mockDelete(id),
  listAllAlbumRequests: vi.fn(),
  updateAlbumRequestStatus: vi.fn(),
  setUserRequestBan: vi.fn(),
}))

const listenerId = 'listener-1'
const pendingReq = {
  id: 'req-1',
  albumName: 'Dummy',
  artistName: 'Portishead',
  externalUrl: 'https://open.spotify.com/album/abc',
  status: 'PENDING',
  requesterId: listenerId,
  requesterUsername: 'alice',
  requesterRequestsBlocked: false,
  adminNote: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const acceptedReq = {
  ...pendingReq,
  id: 'req-2',
  status: 'ACCEPTED',
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AlbumRequestsView, {
    global: { plugins: [pinia] },
  })
}

describe('AlbumRequestsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockListMine.mockResolvedValue([])
  })

  it('loads and renders my requests', async () => {
    mockListMine.mockResolvedValue([pendingReq, acceptedReq])
    const wrapper = mountView()
    await flushPromises()

    expect(mockListMine).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Dummy')
    expect(wrapper.text()).toContain('Portishead')
    expect(wrapper.text()).toContain('PENDING')
    expect(wrapper.text()).toContain('ACCEPTED')
  })

  it('submits new request and clears form', async () => {
    mockListMine.mockResolvedValue([])
    mockCreate.mockResolvedValue(pendingReq)

    const wrapper = mountView()
    await flushPromises()

    const inputs = wrapper.findAll('input')
    await inputs[0]!.setValue('Dummy')
    await inputs[1]!.setValue('Portishead')
    await inputs[2]!.setValue('https://open.spotify.com/album/abc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockCreate).toHaveBeenCalledWith({
      albumName: 'Dummy',
      artistName: 'Portishead',
      externalUrl: 'https://open.spotify.com/album/abc',
    })
    expect(mockToastSuccess).toHaveBeenCalled()
    const values = wrapper.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(values).toEqual(['', '', ''])
  })

  it('shows delete action only for pending requests', async () => {
    mockListMine.mockResolvedValue([pendingReq, acceptedReq])

    const wrapper = mountView()
    await flushPromises()

    const deleteButtons = wrapper.findAll('button').filter((b) => b.text().includes('Delete'))
    expect(deleteButtons).toHaveLength(1)
  })

  it('deletes pending request', async () => {
    mockListMine.mockResolvedValue([pendingReq])
    mockDelete.mockResolvedValue(undefined)

    const wrapper = mountView()
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    await deleteButton!.trigger('click')
    await flushPromises()

    expect(mockDelete).toHaveBeenCalledWith('req-1')
    expect(wrapper.text()).not.toContain('Dummy')
  })

  it('shows backend conflict message on delete failure', async () => {
    mockListMine.mockResolvedValue([pendingReq])
    mockDelete.mockRejectedValue({ response: { data: { error: 'Only pending requests can be deleted' } } })

    const wrapper = mountView()
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'))
    await deleteButton!.trigger('click')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Only pending requests can be deleted')
    expect(mockListMine).toHaveBeenCalledTimes(2)
  })
})
