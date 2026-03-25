<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getArtists } from '@/api/artists'
import { getAlbums } from '@/api/albums'
import { getTracks, uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse, TrackResponse } from '@/api/types'

const artists = ref<ArtistResponse[]>([])
const albums = ref<AlbumResponse[]>([])
const filteredAlbums = ref<AlbumResponse[]>([])
const tracks = ref<TrackResponse[]>([])

const title = ref('')
const artistId = ref('')
const albumId = ref('')
const trackNumber = ref(1)
const durationSeconds = ref(0)
const audioFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()

const loading = ref(false)
const uploadProgress = ref(0)
const error = ref('')
const success = ref('')

onMounted(async () => {
  [artists.value, albums.value, tracks.value] = await Promise.all([
    getArtists(),
    getAlbums(),
    getTracks(),
  ])
  filteredAlbums.value = albums.value
})

watch(artistId, (id) => {
  filteredAlbums.value = id ? albums.value.filter((a) => a.artist.id === id) : albums.value
  albumId.value = ''
})

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  audioFile.value = f
  // Detect duration using Audio element
  const url = URL.createObjectURL(f)
  const audio = new Audio(url)
  audio.addEventListener('loadedmetadata', () => {
    durationSeconds.value = Math.round(audio.duration)
    URL.revokeObjectURL(url)
  })
}

async function submit() {
  if (!audioFile.value) { error.value = 'Please select an audio file'; return }
  error.value = ''
  success.value = ''
  loading.value = true
  uploadProgress.value = 0

  const formData = new FormData()
  formData.append('title', title.value)
  formData.append('albumId', albumId.value)
  formData.append('artistId', artistId.value)
  formData.append('trackNumber', String(trackNumber.value))
  formData.append('durationSeconds', String(durationSeconds.value))
  formData.append('audioFile', audioFile.value)

  try {
    const created = await uploadTrack(formData, (pct) => { uploadProgress.value = pct })
    tracks.value.unshift(created)
    success.value = `"${created.title}" uploaded successfully!`
    title.value = ''
    albumId.value = ''
    trackNumber.value = 1
    durationSeconds.value = 0
    audioFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Upload failed'
  } finally {
    loading.value = false
    uploadProgress.value = 0
  }
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div>
    <h1 class="page-title">Tracks</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="section-title">Upload Track</h2>

      <div class="form-group">
        <label>Artist</label>
        <select v-model="artistId" class="form-input" required>
          <option value="">Select artist…</option>
          <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>Album</label>
        <select v-model="albumId" class="form-input" required :disabled="!artistId">
          <option value="">Select album…</option>
          <option v-for="al in filteredAlbums" :key="al.id" :value="al.id">{{ al.title }}</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex: 1">
          <label>Title</label>
          <input v-model="title" class="form-input" required />
        </div>
        <div class="form-group" style="width: 80px">
          <label>Track #</label>
          <input v-model.number="trackNumber" class="form-input" type="number" min="1" required />
        </div>
      </div>

      <div class="form-group">
        <label>Audio File</label>
        <input
          ref="fileInput"
          type="file"
          accept="audio/mpeg,audio/ogg,audio/flac,audio/wav,audio/aac"
          class="form-input file-input"
          @change="onFileChange"
          required
        />
      </div>

      <div v-if="durationSeconds > 0" class="text-muted">
        Duration detected: {{ formatDuration(durationSeconds) }}
      </div>

      <div v-if="loading" class="progress-wrap">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" :style="{ width: uploadProgress + '%' }" />
        </div>
        <span class="text-muted">{{ uploadProgress }}%</span>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div v-if="success" class="success-msg">{{ success }}</div>

      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Uploading…' : 'Upload track' }}
      </button>
    </form>

    <div class="list-section">
      <h2 class="section-title">All Tracks</h2>
      <div v-if="tracks.length === 0" class="text-muted">No tracks yet.</div>
      <div v-else class="item-list">
        <div v-for="t in tracks" :key="t.id" class="list-item">
          <span class="item-name">{{ t.trackNumber }}. {{ t.title }}</span>
          <span class="text-muted">{{ t.artist.name }} — {{ t.album.title }} · {{ formatDuration(t.durationSeconds) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-form {
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.form-row { display: flex; gap: 12px; align-items: flex-end; }

.file-input { padding: 8px 12px; cursor: pointer; }
.file-input::file-selector-button {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 6px 12px;
  cursor: pointer;
  margin-right: 12px;
  font-size: 13px;
}

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bar-outer { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.progress-bar-inner { height: 100%; background: var(--accent); transition: width 0.2s; }

.success-msg {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--accent);
}

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius-sm); }
.item-name { font-weight: 600; }
</style>
