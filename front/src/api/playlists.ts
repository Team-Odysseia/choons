import client from './client'
import type { PlaylistResponse, PlaylistSummaryResponse } from './types'

export const getPlaylists = () =>
  client.get<PlaylistSummaryResponse[]>('/playlists').then((r) => r.data)

export const getPlaylist = (id: string) =>
  client.get<PlaylistResponse>(`/playlists/${id}`).then((r) => r.data)

export const createPlaylist = (name: string) =>
  client.post<PlaylistResponse>('/playlists', { name }).then((r) => r.data)

export const deletePlaylist = (id: string) => client.delete(`/playlists/${id}`)

export const addTrackToPlaylist = (playlistId: string, trackId: string) =>
  client.post<PlaylistResponse>(`/playlists/${playlistId}/tracks`, { trackId }).then((r) => r.data)

export const removeTrackFromPlaylist = (playlistId: string, trackId: string) =>
  client.delete<PlaylistResponse>(`/playlists/${playlistId}/tracks/${trackId}`).then((r) => r.data)

export const reorderPlaylist = (playlistId: string, orderedTrackIds: string[]) =>
  client
    .put<PlaylistResponse>(`/playlists/${playlistId}/tracks/order`, { orderedTrackIds })
    .then((r) => r.data)

export const setPlaylistVisibility = (playlistId: string, isPublic: boolean) =>
  client
    .put<PlaylistResponse>(`/playlists/${playlistId}/visibility`, { isPublic })
    .then((r) => r.data)

export const getPublicPlaylists = (signal?: AbortSignal) =>
  client.get<PlaylistSummaryResponse[]>('/playlists/public', { signal }).then((r) => r.data)
