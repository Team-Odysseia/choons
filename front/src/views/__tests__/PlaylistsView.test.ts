import { describe, it, expect, beforeEach, vi } from 'vitest'
import { dialogStubs } from '@/test-utils/dialog'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { httpError } from '@/test-utils/http'
import { makePlaylist } from '@/test-utils/fixtures'
import PlaylistsView from '../PlaylistsView.vue'

const api = vi.hoisted(() => ({
  getPlaylists: vi.fn(),
  createPlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
}))
const toastError = vi.hoisted(() => vi.fn())
vi.mock('@/api/playlists', () => api)
vi.mock('vue-sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

const summary = (id: string, name: string, trackCount: number) => ({
  id,
  name,
  trackCount,
  isPublic: false,
  updatedAt: '2024-01-01T00:00:00Z',
})

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/playlists', component: PlaylistsView },
      { path: '/playlists/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/playlists')
  const wrapper = mount(PlaylistsView, {
    global: { plugins: [router], stubs: dialogStubs },
  })
  await flushPromises()
  return { wrapper, router }
}

function button(wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) {
  return wrapper.findAll('button').find((b) => b.text() === label)
}

beforeEach(() => {
  setActivePinia(createPinia())
  api.getPlaylists.mockResolvedValue([])
})

describe('PlaylistsView', () => {
  it('shows the empty state', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('No playlists yet')
  })

  it('lists playlists with track counts', async () => {
    api.getPlaylists.mockResolvedValue([summary('pl-1', 'Night bus', 1), summary('pl-2', 'Gym', 12)])
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Night bus')
    expect(wrapper.text()).toContain('1 track')
    expect(wrapper.text()).toContain('12 tracks')
  })

  it('creates a playlist and opens it', async () => {
    api.createPlaylist.mockResolvedValue(makePlaylist({ id: 'pl-new', name: 'New' }))
    const { wrapper, router } = await mountView()

    await button(wrapper, '+ New playlist')!.trigger('click')
    await wrapper.find('input').setValue('  New  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(api.createPlaylist).toHaveBeenCalledWith('New')
    expect(router.currentRoute.value.path).toBe('/playlists/pl-new')
  })

  it('reports a failed creation', async () => {
    api.createPlaylist.mockRejectedValue(httpError(400, 'name size must be between 0 and 120'))
    const { wrapper } = await mountView()

    await button(wrapper, '+ New playlist')!.trigger('click')
    await wrapper.find('input').setValue('x')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(toastError).toHaveBeenCalledWith('name size must be between 0 and 120')
  })

  it('deletes after confirmation', async () => {
    api.getPlaylists.mockResolvedValue([summary('pl-1', 'Night bus', 1)])
    api.deletePlaylist.mockResolvedValue(undefined)
    const { wrapper } = await mountView()

    await wrapper.find('button[title="Delete"]').trigger('click')
    await button(wrapper, 'Delete')!.trigger('click')
    await flushPromises()

    expect(api.deletePlaylist).toHaveBeenCalledWith('pl-1')
    expect(wrapper.text()).toContain('No playlists yet')
  })

  it('reports a failed load', async () => {
    api.getPlaylists.mockRejectedValue(httpError(500))
    await mountView()
    expect(toastError).toHaveBeenCalledWith('Failed to load playlists')
  })
})
