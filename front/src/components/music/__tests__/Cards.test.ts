import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AlbumCard from '../AlbumCard.vue'
import PlaylistTile from '../PlaylistTile.vue'
import ArtistCard from '../ArtistCard.vue'
import SongCard from '../SongCard.vue'
import PlaylistRow from '../PlaylistRow.vue'
import RequestCard from '../RequestCard.vue'
import { makeAlbum, makeArtist, makeTrack } from '@/test-utils/fixtures'
import { makeTestRouter } from '@/test-utils/router'
import type { AlbumRequestResponse, PlaylistSummaryResponse } from '@/api/types'

async function routerPlugin() {
  const router = makeTestRouter()
  await router.push('/')
  await router.isReady()
  return { global: { plugins: [router] } }
}

const playlist: PlaylistSummaryResponse = { id: 'pl-1', name: 'Night bus', trackCount: 12, isPublic: true, updatedAt: '' }

function makeRequest(status: AlbumRequestResponse['status']): AlbumRequestResponse {
  return {
    id: 'r-1',
    albumName: 'Obsidian',
    artistName: 'Molten Crown',
    externalUrl: 'https://example.com',
    status,
    requesterId: 'u-1',
    requesterUsername: 'marta',
    requesterRequestsBlocked: false,
    adminNote: null,
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
  }
}

describe('AlbumCard', () => {
  it('links to album route', async () => {
    const wrapper = mount(AlbumCard, { props: { album: makeAlbum({ id: 'al-9' }) }, ...(await routerPlugin()) })
    expect(wrapper.find('a').attributes('href')).toBe('/library/albums/al-9')
    expect(wrapper.text()).toContain('Untrue')
  })

  it('shows NEW badge when isNew', async () => {
    const plain = mount(AlbumCard, { props: { album: makeAlbum() }, ...(await routerPlugin()) })
    expect(plain.text()).not.toContain('New')
    const fresh = mount(AlbumCard, { props: { album: makeAlbum(), isNew: true }, ...(await routerPlugin()) })
    expect(fresh.text()).toContain('New')
  })

  it('uses meta when given, otherwise artist name', async () => {
    const def = mount(AlbumCard, { props: { album: makeAlbum() }, ...(await routerPlugin()) })
    expect(def.text()).toContain('Burial')
    const meta = mount(AlbumCard, { props: { album: makeAlbum(), meta: '2007' }, ...(await routerPlugin()) })
    expect(meta.text()).toContain('2007')
  })
})

describe('PlaylistTile', () => {
  it('links to the playlist and shows track count', async () => {
    const wrapper = mount(PlaylistTile, { props: { playlist }, ...(await routerPlugin()) })
    expect(wrapper.find('a').attributes('href')).toBe('/playlists/pl-1')
    expect(wrapper.text()).toContain('Night bus')
    expect(wrapper.text()).toContain('12 tracks')
  })
})

describe('ArtistCard', () => {
  it('links to the artist', async () => {
    const wrapper = mount(ArtistCard, { props: { artist: makeArtist({ id: 'ar-5', name: 'Haldor' }) }, ...(await routerPlugin()) })
    expect(wrapper.find('a').attributes('href')).toBe('/library/artists/ar-5')
    expect(wrapper.text()).toContain('Haldor')
  })
})

describe('SongCard', () => {
  it('emits play when clicked', async () => {
    const wrapper = mount(SongCard, { props: { track: makeTrack() } })
    expect(wrapper.text()).toContain('Archangel')
    expect(wrapper.text()).toContain('3:58')
    await wrapper.trigger('click')
    expect(wrapper.emitted('play')).toHaveLength(1)
  })
})

describe('PlaylistRow', () => {
  it('emits delete only when deletable', async () => {
    const wrapper = mount(PlaylistRow, { props: { playlist, deletable: true }, ...(await routerPlugin()) })
    await wrapper.find('[aria-label="Delete playlist"]').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
    const locked = mount(PlaylistRow, { props: { playlist, deletable: false }, ...(await routerPlugin()) })
    expect(locked.find('[aria-label="Delete playlist"]').exists()).toBe(false)
  })
})

describe('RequestCard', () => {
  it('PENDING uses amber badge', () => {
    const wrapper = mount(RequestCard, { props: { request: makeRequest('PENDING') } })
    const badge = wrapper.find('[data-testid="request-status"]')
    expect(badge.text()).toBe('PENDING')
    expect(badge.classes()).toContain('text-amber')
  })

  it('REJECTED uses red badge', () => {
    const wrapper = mount(RequestCard, { props: { request: makeRequest('REJECTED') } })
    expect(wrapper.find('[data-testid="request-status"]').classes()).toContain('text-red')
  })

  it('renders actions slot and requester', () => {
    const wrapper = mount(RequestCard, {
      props: { request: makeRequest('ACCEPTED'), requester: 'marta' },
      slots: { actions: '<button>Accept</button>' },
    })
    expect(wrapper.text()).toContain('Obsidian')
    expect(wrapper.text()).toContain('marta')
    expect(wrapper.find('button').text()).toBe('Accept')
  })
})
