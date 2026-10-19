import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { httpError } from '@/test-utils/http'
import { makeTrack } from '@/test-utils/fixtures'
import FavoritesView from '../FavoritesView.vue'

const getFavorites = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
vi.mock('@/api/favorites', () => ({
  getFavorites,
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  checkFavorites: vi.fn(),
}))
vi.mock('vue-sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))

function mountView() {
  return mount(FavoritesView, {
    global: { stubs: { TrackRow: { props: ['track'], template: '<div class="row">{{ track.title }}</div>' } } },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('FavoritesView', () => {
  it('shows loading while favorites are fetched', async () => {
    getFavorites.mockReturnValue(new Promise(() => {}))
    const wrapper = mountView()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Loading')
  })

  it('shows the empty state', async () => {
    getFavorites.mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('No favorites yet')
  })

  it('lists favorite tracks', async () => {
    getFavorites.mockResolvedValue([
      { track: makeTrack({ id: 't-1', title: 'Archangel' }), favoritedAt: '' },
      { track: makeTrack({ id: 't-2', title: 'Near Dark' }), favoritedAt: '' },
    ])
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.findAll('.row').map((r) => r.text())).toEqual(['Archangel', 'Near Dark'])
  })

  it('reports a failed load', async () => {
    getFavorites.mockRejectedValue(httpError(500))
    const wrapper = mountView()
    await flushPromises()
    expect(toastError).toHaveBeenCalledWith('Failed to load favorites')
    expect(wrapper.text()).toContain('No favorites yet')
  })
})
