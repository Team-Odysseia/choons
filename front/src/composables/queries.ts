import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getArtists, getArtist } from '@/api/artists'
import { getAlbums, getAlbum } from '@/api/albums'
import { getTracks, getMostPlayedTracks } from '@/api/tracks'
import type { Ref } from 'vue'

export const useArtistsQuery = () =>
  useQuery({ queryKey: ['artists'], queryFn: getArtists })

export const useArtistQuery = (id: Ref<string>) =>
  useQuery({
    queryKey: computed(() => ['artists', id.value]),
    queryFn: () => getArtist(id.value),
  })

export const useAlbumsQuery = (artistId?: Ref<string | undefined>) =>
  useQuery({
    queryKey: computed(() => ['albums', artistId?.value]),
    queryFn: () => getAlbums(artistId?.value),
  })

export const useRecentAlbumsQuery = () =>
  useQuery({
    queryKey: ['albums'],
    queryFn: getAlbums,
    select: (albums) =>
      [...albums]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10),
  })

export const useAllAlbumsQuery = () =>
  useQuery({
    queryKey: ['albums'],
    queryFn: getAlbums,
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
