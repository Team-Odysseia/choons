import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/favorites'
import type { TrackResponse } from '@/api/types'
import { toast } from 'vue-sonner'

const CHECK_BATCH_SIZE = 500

export const useFavoritesStore = defineStore('favorites', () => {
  const favoriteIds = ref<Set<string>>(new Set())
  const tracks = ref<TrackResponse[]>([])
  const loading = ref(false)

  function isFavorited(id: string) {
    return favoriteIds.value.has(id)
  }

  async function fetchFavorites() {
    loading.value = true
    try {
      const data = await api.getFavorites()
      tracks.value = data.map((f) => f.track)
      favoriteIds.value = new Set(data.map((f) => f.track.id))
    } finally {
      loading.value = false
    }
  }

  async function fetchStatus(trackIds: string[]) {
    const unique = [...new Set(trackIds)]
    for (let start = 0; start < unique.length; start += CHECK_BATCH_SIZE) {
      const batch = unique.slice(start, start + CHECK_BATCH_SIZE)
      try {
        const ids = await api.checkFavorites(batch)
        const newSet = new Set(favoriteIds.value)
        for (const trackId of batch) newSet.delete(trackId)
        for (const id of ids) newSet.add(id)
        favoriteIds.value = newSet
      } catch {
        return
      }
    }
  }

  async function toggle(trackId: string) {
    const wasFavorited = favoriteIds.value.has(trackId)

    const prevIds = new Set(favoriteIds.value)
    const prevTracks = [...tracks.value]

    if (wasFavorited) {
      favoriteIds.value = new Set([...favoriteIds.value].filter((id) => id !== trackId))
      tracks.value = tracks.value.filter((t) => t.id !== trackId)
    } else {
      favoriteIds.value = new Set([...favoriteIds.value, trackId])
    }

    try {
      if (wasFavorited) {
        await api.removeFavorite(trackId)
      } else {
        await api.addFavorite(trackId)
      }
    } catch {
      favoriteIds.value = prevIds
      tracks.value = prevTracks
      toast.error(wasFavorited ? 'Failed to remove favorite' : 'Failed to add favorite')
    }
  }

  return {
    favoriteIds,
    tracks,
    loading,
    isFavorited,
    fetchFavorites,
    fetchStatus,
    toggle,
  }
})
