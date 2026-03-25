export type UserRole = 'ADMIN' | 'LISTENER'

export interface UserResponse {
  id: string
  username: string
  role: UserRole
}

export interface AuthResponse {
  token: string
}

export interface ArtistResponse {
  id: string
  name: string
  bio: string | null
  createdAt: string
}

export interface AlbumResponse {
  id: string
  title: string
  artist: ArtistResponse
  releaseYear: number
  createdAt: string
}

export interface TrackResponse {
  id: string
  title: string
  album: AlbumResponse
  artist: ArtistResponse
  trackNumber: number
  durationSeconds: number
  createdAt: string
}

export interface PlaylistSummaryResponse {
  id: string
  name: string
  trackCount: number
  updatedAt: string
}

export interface PlaylistResponse {
  id: string
  name: string
  ownerId: string
  tracks: TrackResponse[]
  createdAt: string
  updatedAt: string
}
