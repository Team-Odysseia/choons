import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/playlists'
import type { PlaylistResponse, PlaylistSummaryResponse } from '@/api/types'

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref<PlaylistSummaryResponse[]>([])
  const current = ref<PlaylistResponse | null>(null)
  const loading = ref(false)

  async function fetchMyPlaylists() {
    loading.value = true
    try {
      playlists.value = await api.getPlaylists()
    } finally {
      loading.value = false
    }
  }

  async function fetchPlaylist(id: string) {
    loading.value = true
    try {
      current.value = await api.getPlaylist(id)
    } finally {
      loading.value = false
    }
  }

  async function createPlaylist(name: string) {
    const created = await api.createPlaylist(name)
    playlists.value.unshift({ id: created.id, name: created.name, trackCount: 0, updatedAt: created.updatedAt })
    return created
  }

  async function deletePlaylist(id: string) {
    await api.deletePlaylist(id)
    playlists.value = playlists.value.filter((p) => p.id !== id)
    if (current.value?.id === id) current.value = null
  }

  async function addTrack(playlistId: string, trackId: string) {
    current.value = await api.addTrackToPlaylist(playlistId, trackId)
    syncSummary(current.value)
  }

  async function removeTrack(playlistId: string, trackId: string) {
    current.value = await api.removeTrackFromPlaylist(playlistId, trackId)
    syncSummary(current.value)
  }

  async function reorder(playlistId: string, orderedTrackIds: string[]) {
    current.value = await api.reorderPlaylist(playlistId, orderedTrackIds)
  }

  function syncSummary(playlist: PlaylistResponse) {
    const idx = playlists.value.findIndex((p) => p.id === playlist.id)
    if (idx !== -1) {
      playlists.value[idx] = {
        id: playlist.id,
        name: playlist.name,
        trackCount: playlist.tracks.length,
        updatedAt: playlist.updatedAt,
      }
    }
  }

  return {
    playlists,
    current,
    loading,
    fetchMyPlaylists,
    fetchPlaylist,
    createPlaylist,
    deletePlaylist,
    addTrack,
    removeTrack,
    reorder,
  }
})
