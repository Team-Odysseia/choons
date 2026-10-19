import { computed } from 'vue'
import { useInfiniteQuery, useQuery } from '@tanstack/vue-query'
import { getArtist, getArtistsPage } from '@/api/artists'
import { getAlbums, getAlbum, getAlbumsPage, getRecentAlbums, searchAlbums } from '@/api/albums'
import { getTracks, getMostPlayedTracks } from '@/api/tracks'
import type { Ref } from 'vue'

const FIVE_MINUTES = 5 * 60 * 1000
export const LIST_PAGE_SIZE = 100
const RECENT_ALBUMS = 10

function nextPage<T>(lastPage: T[], allPages: T[][]) {
  return lastPage.length === LIST_PAGE_SIZE ? allPages.length : undefined
}

export const useArtistsInfiniteQuery = () =>
  useInfiniteQuery({
    queryKey: ['artists', 'pages'],
    queryFn: ({ pageParam }) => getArtistsPage(pageParam, LIST_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    staleTime: FIVE_MINUTES,
  })

export const useArtistQuery = (id: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['artists', id.value]),
    queryFn: () => getArtist(id.value),
    staleTime: FIVE_MINUTES,
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
    staleTime: FIVE_MINUTES,
  })

export const useRecentAlbumsQuery = () =>
  useQuery({
    queryKey: ['albums', 'recent', RECENT_ALBUMS],
    queryFn: () => getRecentAlbums(RECENT_ALBUMS),
    staleTime: FIVE_MINUTES,
  })

export const useAllAlbumsInfiniteQuery = (query: Ref<string>) =>
  useInfiniteQuery({
    queryKey: computed(() => ['albums', 'all', query.value]),
    queryFn: ({ pageParam }) =>
      getAlbumsPage({ page: pageParam, size: LIST_PAGE_SIZE, query: query.value, sort: 'recent' }),
    initialPageParam: 0,
    getNextPageParam: nextPage,
    staleTime: FIVE_MINUTES,
  })

export const useAlbumQuery = (id: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['albums', id.value]),
    queryFn: () => getAlbum(id.value),
    staleTime: FIVE_MINUTES,
  })

export const useAlbumTracksQuery = (albumId: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['tracks', 'album', albumId.value]),
    queryFn: () => getTracks(albumId.value),
    staleTime: FIVE_MINUTES,
  })

export const useMostPlayedQuery = (limit = 5) =>
  useQuery({
    queryKey: ['tracks', 'most-played', limit],
    queryFn: () => getMostPlayedTracks(limit),
    staleTime: FIVE_MINUTES,
  })
