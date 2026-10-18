import client from './client'
import type { ArtistResponse } from './types'

export const getArtists = () =>
  client.get<ArtistResponse[]>('/music/artists').then((r) => r.data)

export const searchArtists = (query: string, page = 0, size = 100, signal?: AbortSignal) =>
  client
    .get<ArtistResponse[]>('/music/artists', { params: { query, page, size }, signal })
    .then((r) => r.data)

export const getArtist = (id: string) =>
  client.get<ArtistResponse>(`/music/artists/${id}`).then((r) => r.data)

export const createArtist = (name: string, bio: string, avatarFile?: File | null) => {
  const fd = new FormData()
  fd.append('name', name)
  fd.append('bio', bio)
  if (avatarFile) fd.append('avatarFile', avatarFile)
  return client
    .post<ArtistResponse>('/admin/artists', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}

export const getAdminArtist = (id: string) =>
  client.get<ArtistResponse>(`/admin/artists/${id}`).then((r) => r.data)

export const updateArtist = (id: string, formData: FormData) =>
  client
    .put<ArtistResponse>(`/admin/artists/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const deleteArtist = (id: string) =>
  client.delete(`/admin/artists/${id}`)

export const deleteArtistAvatar = (id: string) =>
  client.delete(`/admin/artists/${id}/avatar`)

export const artistImageUrl = (artistId: string) => {
  return `${import.meta.env.VITE_API_URL}/media/images/artists/${artistId}`
}
