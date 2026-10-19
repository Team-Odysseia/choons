import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { httpError } from '@/test-utils/http'
import { makeAlbum, makeArtist } from '@/test-utils/fixtures'
import ArtistView from '../ArtistView.vue'

const getArtist = vi.hoisted(() => vi.fn())
const getAlbums = vi.hoisted(() => vi.fn())
vi.mock('@/api/artists', () => ({ getArtist, artistImageUrl: (id: string) => `/media/images/artists/${id}` }))
vi.mock('@/api/albums', () => ({ getAlbums, albumImageUrl: (id: string) => `/media/images/albums/${id}` }))

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/library/artists/:id', component: ArtistView },
      { path: '/library/albums/:id', component: { template: '<div />' } },
    ],
  })
  await router.push('/library/artists/ar-1')
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(ArtistView, { global: { plugins: [router, [VueQueryPlugin, { queryClient }]] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  setActivePinia(createPinia())
  getArtist.mockResolvedValue(makeArtist({ bio: 'South London' }))
  getAlbums.mockResolvedValue([makeAlbum(), makeAlbum({ id: 'al-2', title: 'Burial', releaseYear: 2006 })])
})

describe('ArtistView', () => {
  it('renders the artist and their albums', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('h1').text()).toBe('Burial')
    expect(wrapper.text()).toContain('South London')
    expect(wrapper.text()).toContain('Untrue')
    expect(getAlbums).toHaveBeenCalledWith('ar-1')
  })

  it('shows the empty state without albums', async () => {
    getAlbums.mockResolvedValue([])
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('No albums yet.')
  })

  it('shows a message when the artist does not exist', async () => {
    getArtist.mockRejectedValue(httpError(404, 'Artist not found: ar-1'))
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('This artist is not available.')
  })

  it('opens an album', async () => {
    const { wrapper, router } = await mountView()
    await wrapper.findAll('[class*="bg-card"]')[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/library/albums/al-1')
  })
})
