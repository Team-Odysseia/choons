import client from './client'
import type { AuthResponse, ListenerRequestBanResponse, UserResponse } from './types'

export const login = (username: string, password: string) =>
  client.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data)

export const logout = () => client.post('/auth/logout')

export const me = () => client.get<UserResponse>('/auth/me').then((r) => r.data)

export const registerListener = (username: string, password: string) =>
  client.post<UserResponse>('/auth/register', { username, password }).then((r) => r.data)

export const getListeners = (query?: string) =>
  client
    .get<ListenerRequestBanResponse[]>('/admin/listeners', { params: query ? { query } : undefined })
    .then((r) => r.data)

export const updateListener = (id: string, username: string, password?: string) =>
  client
    .put<ListenerRequestBanResponse>(`/admin/listeners/${id}`, {
      username,
      password: password ?? '',
    })
    .then((r) => r.data)

export const deleteListener = (id: string) => client.delete(`/admin/listeners/${id}`)
