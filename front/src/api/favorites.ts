import client from './client'
import type { FavoriteTrackResponse, TrackResponse } from './types'

export const getFavorites = () =>
  client.get<FavoriteTrackResponse[]>('/favorites').then((r) => r.data)

export const addFavorite = (trackId: string) =>
  client.post<TrackResponse>(`/favorites/${trackId}`).then((r) => r.data)

export const removeFavorite = (trackId: string) =>
  client.delete(`/favorites/${trackId}`)

export const checkFavorites = (trackIds: string[]) =>
  client
    .get<string[]>('/favorites/check', { params: { trackIds: trackIds.join(',') } })
    .then((r) => r.data)
