import client from './client'
import type { TrackResponse } from './types'

export const getTracks = (albumId?: string) =>
  client
    .get<TrackResponse[]>('/music/tracks', { params: albumId ? { albumId } : {} })
    .then((r) => r.data)

export const getMostPlayedTracks = (limit = 10) =>
  client
    .get<TrackResponse[]>('/music/tracks/most-played', { params: { limit } })
    .then((r) => r.data)

export const getTrack = (id: string) =>
  client.get<TrackResponse>(`/music/tracks/${id}`).then((r) => r.data)

export const uploadTrack = (
  formData: FormData,
  onProgress?: (percent: number) => void,
) =>
  client
    .post<TrackResponse>('/admin/tracks', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
    .then((r) => r.data)

export const uploadTracks = (
  formData: FormData,
  onProgress?: (percent: number) => void,
) =>
  client
    .post<TrackResponse[]>('/admin/tracks/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    })
    .then((r) => r.data)

export const updateAlbumTracks = (
  albumId: string,
  tracks: Array<{ id: string; title: string; trackNumber: number }>,
) =>
  client.put<TrackResponse[]>(`/admin/albums/${albumId}/tracks`, tracks).then((r) => r.data)

export const updateTrackLrclibId = (id: string, lrclibId: number | null) =>
  client.put<TrackResponse>(`/admin/tracks/${id}/lrclib-id`, { lrclibId }).then((r) => r.data)

export const deleteTrack = (id: string) => client.delete(`/admin/tracks/${id}`)

export const recordStream = (trackId: string) =>
  client.post(`/stream/${trackId}/played`)

export const streamUrl = (trackId: string) => {
  return `${import.meta.env.VITE_API_URL}/stream/${trackId}`
}
