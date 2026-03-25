import client from './client'
import type { AlbumResponse } from './types'

export const getAlbums = (artistId?: string) =>
  client
    .get<AlbumResponse[]>('/music/albums', { params: artistId ? { artistId } : {} })
    .then((r) => r.data)

export const getAlbum = (id: string) =>
  client.get<AlbumResponse>(`/music/albums/${id}`).then((r) => r.data)

export const createAlbum = (title: string, artistId: string, releaseYear: number) =>
  client.post<AlbumResponse>('/admin/albums', { title, artistId, releaseYear }).then((r) => r.data)
