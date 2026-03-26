import client from './client'
import type { TrackResponse } from './types'

export const getTracks = (albumId?: string) =>
  client
    .get<TrackResponse[]>('/music/tracks', { params: albumId ? { albumId } : {} })
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

export const streamUrl = (trackId: string) => {
  const token = localStorage.getItem('token')
  return `${import.meta.env.VITE_API_URL}/stream/${trackId}?token=${token}`
}
