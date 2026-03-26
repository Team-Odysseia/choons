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

export const getAdminAlbum = (id: string) =>
  client.get<AlbumResponse>(`/admin/albums/${id}`).then((r) => r.data)

export const updateAlbum = (id: string, formData: FormData) =>
  client
    .put<AlbumResponse>(`/admin/albums/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const deleteAlbumCover = (id: string) =>
  client.delete(`/admin/albums/${id}/cover`)

export const albumImageUrl = (albumId: string) => {
  const token = localStorage.getItem('token')
  return `${import.meta.env.VITE_API_URL}/media/images/albums/${albumId}?token=${token}`
}
