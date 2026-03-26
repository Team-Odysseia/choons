import client from './client'
import type { ArtistResponse } from './types'

export const getArtists = () =>
  client.get<ArtistResponse[]>('/music/artists').then((r) => r.data)

export const getArtist = (id: string) =>
  client.get<ArtistResponse>(`/music/artists/${id}`).then((r) => r.data)

export const createArtist = (name: string, bio: string) =>
  client.post<ArtistResponse>('/admin/artists', { name, bio }).then((r) => r.data)

export const getAdminArtist = (id: string) =>
  client.get<ArtistResponse>(`/admin/artists/${id}`).then((r) => r.data)

export const updateArtist = (id: string, formData: FormData) =>
  client
    .put<ArtistResponse>(`/admin/artists/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const deleteArtistAvatar = (id: string) =>
  client.delete(`/admin/artists/${id}/avatar`)

export const artistImageUrl = (artistId: string) => {
  const token = localStorage.getItem('token')
  return `${import.meta.env.VITE_API_URL}/media/images/artists/${artistId}?token=${token}`
}
