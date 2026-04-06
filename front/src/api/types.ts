export type UserRole = 'ADMIN' | 'LISTENER'
export type AlbumRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

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
  avatarUrl: string | null
}

export interface AlbumResponse {
  id: string
  title: string
  artist: ArtistResponse
  releaseYear: number
  createdAt: string
  coverUrl: string | null
}

export interface TrackResponse {
  id: string
  title: string
  album: AlbumResponse
  artist: ArtistResponse
  trackNumber: number
  durationSeconds: number
  createdAt: string
  hifi: boolean
  lrclibId: number | null
}

export interface PlaylistSummaryResponse {
  id: string
  name: string
  trackCount: number
  isPublic: boolean
  updatedAt: string
}

export interface PlaylistResponse {
  id: string
  name: string
  ownerId: string
  tracks: TrackResponse[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface AlbumRequestResponse {
  id: string
  albumName: string
  artistName: string
  externalUrl: string
  status: AlbumRequestStatus
  requesterId: string
  requesterUsername: string
  requesterRequestsBlocked: boolean
  adminNote: string | null
  createdAt: string
  updatedAt: string
}

export interface ListenerRequestBanResponse {
  id: string
  username: string
  requestsBlocked: boolean
}
