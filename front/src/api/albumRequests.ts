import client from './client'
import type { AlbumRequestResponse, AlbumRequestStatus, ListenerRequestBanResponse } from './types'

export interface CreateAlbumRequestPayload {
  albumName: string
  artistName: string
  externalUrl: string
}

export const createAlbumRequest = (payload: CreateAlbumRequestPayload) =>
  client.post<AlbumRequestResponse>('/album-requests', payload).then((r) => r.data)

export const listMyAlbumRequests = () =>
  client.get<AlbumRequestResponse[]>('/album-requests/mine').then((r) => r.data)

export const deleteAlbumRequest = (id: string) =>
  client.delete(`/album-requests/${id}`)

export const listAllAlbumRequests = () =>
  client.get<AlbumRequestResponse[]>('/admin/album-requests').then((r) => r.data)

export const updateAlbumRequestStatus = (id: string, status: Exclude<AlbumRequestStatus, 'PENDING'>) =>
  client.put<AlbumRequestResponse>(`/admin/album-requests/${id}/status`, { status }).then((r) => r.data)

export const setUserRequestBan = (userId: string, blocked: boolean) =>
  client
    .put<ListenerRequestBanResponse>(`/admin/listeners/${userId}/request-ban`, { blocked })
    .then((r) => r.data)
