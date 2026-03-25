import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getArtists, getArtist } from '@/api/artists'
import { getAlbums, getAlbum } from '@/api/albums'
import { getTracks } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse, TrackResponse } from '@/api/types'

export const useMusicStore = defineStore('music', () => {
  const artists = ref<ArtistResponse[]>([])
  const albums = ref<AlbumResponse[]>([])
  const currentArtist = ref<ArtistResponse | null>(null)
  const currentAlbum = ref<AlbumResponse | null>(null)
  const currentAlbumTracks = ref<TrackResponse[]>([])
  const loading = ref(false)

  async function fetchArtists() {
    loading.value = true
    try {
      artists.value = await getArtists()
    } finally {
      loading.value = false
    }
  }

  async function fetchArtist(id: string) {
    loading.value = true
    try {
      currentArtist.value = await getArtist(id)
      albums.value = await getAlbums(id)
    } finally {
      loading.value = false
    }
  }

  async function fetchAlbum(id: string) {
    loading.value = true
    try {
      currentAlbum.value = await getAlbum(id)
      currentAlbumTracks.value = await getTracks(id)
    } finally {
      loading.value = false
    }
  }

  return {
    artists,
    albums,
    currentArtist,
    currentAlbum,
    currentAlbumTracks,
    loading,
    fetchArtists,
    fetchArtist,
    fetchAlbum,
  }
})
