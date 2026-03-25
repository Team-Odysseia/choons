import client from './client'
import type { AuthResponse, UserResponse } from './types'

export const login = (username: string, password: string) =>
  client.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data)

export const me = () => client.get<UserResponse>('/auth/me').then((r) => r.data)

export const registerListener = (username: string, password: string) =>
  client.post<UserResponse>('/auth/register', { username, password }).then((r) => r.data)
