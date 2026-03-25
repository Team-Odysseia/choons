import client from './client'
import type { ArtistResponse } from './types'

export const getArtists = () =>
  client.get<ArtistResponse[]>('/music/artists').then((r) => r.data)

export const getArtist = (id: string) =>
  client.get<ArtistResponse>(`/music/artists/${id}`).then((r) => r.data)

export const createArtist = (name: string, bio: string) =>
  client.post<ArtistResponse>('/admin/artists', { name, bio }).then((r) => r.data)
