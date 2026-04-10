import client from './client'
import type { AlbumResponse } from './types'

export const getAlbums = (artistId?: string) =>
  client
    .get<AlbumResponse[]>('/music/albums', { params: artistId ? { artistId } : {} })
    .then((r) => r.data)

export const searchAlbums = (
  query: string,
  opts?: { artistId?: string; page?: number; size?: number },
) =>
  client
    .get<AlbumResponse[]>('/music/albums', {
      params: {
        query,
        artistId: opts?.artistId,
        page: opts?.page ?? 0,
        size: opts?.size ?? 100,
      },
    })
    .then((r) => r.data)

export const getAlbum = (id: string) =>
  client.get<AlbumResponse>(`/music/albums/${id}`).then((r) => r.data)

export const createAlbum = (title: string, artistId: string, releaseYear: number, coverFile?: File | null) => {
  const fd = new FormData()
  fd.append('title', title)
  fd.append('artistId', artistId)
  fd.append('releaseYear', String(releaseYear))
  if (coverFile) fd.append('coverFile', coverFile)
  return client
    .post<AlbumResponse>('/admin/albums', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}

export const getAdminAlbum = (id: string) =>
  client.get<AlbumResponse>(`/admin/albums/${id}`).then((r) => r.data)

export const updateAlbum = (id: string, formData: FormData) =>
  client
    .put<AlbumResponse>(`/admin/albums/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const deleteAlbum = (id: string) =>
  client.delete(`/admin/albums/${id}`)

export const deleteAlbumCover = (id: string) =>
  client.delete(`/admin/albums/${id}/cover`)

export const albumImageUrl = (albumId: string) => {
  return `${import.meta.env.VITE_API_URL}/media/images/albums/${albumId}`
}
