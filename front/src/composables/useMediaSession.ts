import { watch, type Ref } from 'vue'
import type { TrackResponse } from '@/api/types'

export function useMediaSession(
  currentTrack: Ref<TrackResponse | null>,
  handlers: {
    onPlay: () => void
    onPause: () => void
    onPreviousTrack: () => void
    onNextTrack: () => void
  },
) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', handlers.onPlay)
    navigator.mediaSession.setActionHandler('pause', handlers.onPause)
    navigator.mediaSession.setActionHandler('previoustrack', handlers.onPreviousTrack)
    navigator.mediaSession.setActionHandler('nexttrack', handlers.onNextTrack)
  }

  watch(currentTrack, (track) => {
    if (!('mediaSession' in navigator)) return
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist.name,
        album: track.album.title,
      })
    } else {
      navigator.mediaSession.metadata = null
    }
  })
}
