import type { AlbumResponse, ArtistResponse, PlaylistResponse, TrackResponse } from '@/api/types'

export function makeArtist(overrides: Partial<ArtistResponse> = {}): ArtistResponse {
  return { id: 'ar-1', name: 'Burial', bio: null, createdAt: '2024-01-01T00:00:00Z', avatarUrl: null, ...overrides }
}

export function makeAlbum(overrides: Partial<AlbumResponse> = {}): AlbumResponse {
  return {
    id: 'al-1',
    title: 'Untrue',
    artist: makeArtist(),
    releaseYear: 2007,
    createdAt: '2024-01-01T00:00:00Z',
    coverUrl: null,
    ...overrides,
  }
}

export function makeTrack(overrides: Partial<TrackResponse> = {}): TrackResponse {
  return {
    id: 't-1',
    title: 'Archangel',
    album: makeAlbum(),
    artist: makeArtist(),
    trackNumber: 1,
    durationSeconds: 238,
    createdAt: '2024-01-01T00:00:00Z',
    hifi: false,
    lrclibId: null,
    ...overrides,
  }
}

export function makePlaylist(overrides: Partial<PlaylistResponse> = {}): PlaylistResponse {
  return {
    id: 'pl-1',
    name: 'Night bus',
    ownerId: 'u-1',
    tracks: [],
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}
