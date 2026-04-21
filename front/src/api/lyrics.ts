export interface LrclibResponse {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

const BASE = 'https://lrclib.net/api'

export async function fetchLyricsByLrclibId(lrclibId: number, signal?: AbortSignal): Promise<LrclibResponse | null> {
  const res = await fetch(`${BASE}/get/${lrclibId}`, { signal })
  if (!res.ok) return null
  return res.json()
}

export async function searchLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
  duration: number,
  signal?: AbortSignal,
): Promise<LrclibResponse | null> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
    album_name: albumName,
    duration: String(duration),
  })
  const res = await fetch(`${BASE}/get?${params}`, { signal })
  if (!res.ok) return null
  return res.json()
}
