import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminAlbumRequestsView from '../AdminAlbumRequestsView.vue'

const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

const mockListAll = vi.hoisted(() => vi.fn())
const mockUpdateStatus = vi.hoisted(() => vi.fn())
const mockSetBan = vi.hoisted(() => vi.fn())

vi.mock('@/api/albumRequests', () => ({
  listMyAlbumRequests: vi.fn(),
  createAlbumRequest: vi.fn(),
  deleteAlbumRequest: vi.fn(),
  listAllAlbumRequests: () => mockListAll(),
  updateAlbumRequestStatus: (id: string, status: string) => mockUpdateStatus(id, status),
  setUserRequestBan: (id: string, blocked: boolean) => mockSetBan(id, blocked),
}))

const requestItem = {
  id: 'req-1',
  albumName: 'Dummy',
  artistName: 'Portishead',
  externalUrl: 'https://open.spotify.com/album/abc',
  status: 'PENDING',
  requesterId: 'listener-1',
  requesterUsername: 'alice',
  requesterRequestsBlocked: false,
  adminNote: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(AdminAlbumRequestsView, {
    global: { plugins: [pinia] },
  })
}

describe('AdminAlbumRequestsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockListAll.mockResolvedValue([])
  })

  it('loads and renders incoming requests', async () => {
    mockListAll.mockResolvedValue([requestItem])

    const wrapper = mountView()
    await flushPromises()

    expect(mockListAll).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Dummy')
    expect(wrapper.text()).toContain('Portishead')
    expect(wrapper.text()).toContain('alice')
  })

  it('accepts request status', async () => {
    mockListAll.mockResolvedValue([requestItem])
    mockUpdateStatus.mockResolvedValue({ ...requestItem, status: 'ACCEPTED' })

    const wrapper = mountView()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Accept'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockUpdateStatus).toHaveBeenCalledWith('req-1', 'ACCEPTED')
    expect(wrapper.text()).toContain('ACCEPTED')
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('rejects request status', async () => {
    mockListAll.mockResolvedValue([requestItem])
    mockUpdateStatus.mockResolvedValue({ ...requestItem, status: 'REJECTED' })

    const wrapper = mountView()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Reject'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockUpdateStatus).toHaveBeenCalledWith('req-1', 'REJECTED')
    expect(wrapper.text()).toContain('REJECTED')
  })

  it('blocks requester', async () => {
    mockListAll.mockResolvedValue([requestItem])
    mockSetBan.mockResolvedValue({ id: 'listener-1', username: 'alice', requestsBlocked: true })

    const wrapper = mountView()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Block requester'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockSetBan).toHaveBeenCalledWith('listener-1', true)
    expect(wrapper.text()).toContain('Blocked')
  })

  it('unblocks requester', async () => {
    const blocked = { ...requestItem, requesterRequestsBlocked: true }
    mockListAll.mockResolvedValue([blocked])
    mockSetBan.mockResolvedValue({ id: 'listener-1', username: 'alice', requestsBlocked: false })

    const wrapper = mountView()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Unblock requester'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockSetBan).toHaveBeenCalledWith('listener-1', false)
  })

  it('shows api failure toast', async () => {
    mockListAll.mockResolvedValue([requestItem])
    mockUpdateStatus.mockRejectedValue({ response: { data: { error: 'Cannot change status' } } })

    const wrapper = mountView()
    await flushPromises()

    const btn = wrapper.findAll('button').find((b) => b.text().includes('Accept'))
    await btn!.trigger('click')
    await flushPromises()

    expect(mockToastError).toHaveBeenCalledWith('Cannot change status')
  })
})
