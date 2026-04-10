import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getArtists, getArtist, searchArtists } from '@/api/artists'
import { getAlbums, getAlbum, searchAlbums } from '@/api/albums'
import { getTracks, getMostPlayedTracks } from '@/api/tracks'
import type { Ref } from 'vue'

export const useArtistsQuery = (query?: Ref<string | undefined>, page?: Ref<number>, size = 100) =>
  useQuery({
    queryKey: computed(() => ['artists', query?.value ?? '', page?.value ?? 0, size]),
    queryFn: () => {
      const normalized = query?.value?.trim() ?? ''
      if (!normalized) {
        return getArtists()
      }
      return searchArtists(normalized, page?.value ?? 0, size)
    },
  })

export const useArtistQuery = (id: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['artists', id.value]),
    queryFn: () => getArtist(id.value),
  })

export const useAlbumsQuery = (
  artistId?: Ref<string | undefined>,
  query?: Ref<string | undefined>,
  page?: Ref<number>,
  size = 100,
) =>
  useQuery({
    queryKey: computed(() => ['albums', artistId?.value, query?.value ?? '', page?.value ?? 0, size]),
    queryFn: () => {
      const normalized = query?.value?.trim() ?? ''
      if (!normalized) {
        return getAlbums(artistId?.value)
      }
      return searchAlbums(normalized, { artistId: artistId?.value, page: page?.value ?? 0, size })
    },
  })

export const useRecentAlbumsQuery = () =>
  useQuery({
    queryKey: ['albums'],
    queryFn: () => getAlbums(),
    select: (albums) =>
      [...albums]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
  })

export const useAllAlbumsQuery = (query?: Ref<string | undefined>, page?: Ref<number>, size = 100) =>
  useQuery({
    queryKey: computed(() => ['albums', 'all', query?.value ?? '', page?.value ?? 0, size]),
    queryFn: () => {
      const normalized = query?.value?.trim() ?? ''
      if (!normalized) {
        return getAlbums()
      }
      return searchAlbums(normalized, { page: page?.value ?? 0, size })
    },
    select: (albums) =>
      [...albums].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  })

export const useAlbumQuery = (id: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['albums', id.value]),
    queryFn: () => getAlbum(id.value),
  })

export const useAlbumTracksQuery = (albumId: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['tracks', 'album', albumId.value]),
    queryFn: () => getTracks(albumId.value),
  })

export const useMostPlayedQuery = (limit = 5) =>
  useQuery({
    queryKey: ['tracks', 'most-played', limit],
    queryFn: () => getMostPlayedTracks(limit),
  })
