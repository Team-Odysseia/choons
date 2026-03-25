<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getArtists } from '@/api/artists'
import { getAlbums } from '@/api/albums'
import { getTracks, uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse, TrackResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

onMounted(async () => {
  ;[artists.value, albums.value, tracks.value] = await Promise.all([
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
  const url = URL.createObjectURL(f)
  const audio = new Audio(url)
  audio.addEventListener('loadedmetadata', () => {
    durationSeconds.value = Math.round(audio.duration)
    URL.revokeObjectURL(url)
  })
}

async function submit() {
  if (!audioFile.value) {
    toast.error('Please select an audio file')
    return
  }
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
    const created = await uploadTrack(formData, (pct) => {
      uploadProgress.value = pct
    })
    tracks.value.unshift(created)
    toast.success(`"${created.title}" uploaded successfully!`)
    title.value = ''
    albumId.value = ''
    trackNumber.value = 1
    durationSeconds.value = 0
    audioFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Upload failed')
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
    <h1 class="text-[28px] font-extrabold mb-6">Tracks</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="text-lg font-bold mb-4">Upload Track</h2>

      <div class="form-group">
        <Label>Artist</Label>
        <select
          v-model="artistId"
          class="flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="">Select artist…</option>
          <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>

      <div class="form-group">
        <Label>Album</Label>
        <select
          v-model="albumId"
          class="flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          required
          :disabled="!artistId"
        >
          <option value="">Select album…</option>
          <option v-for="al in filteredAlbums" :key="al.id" :value="al.id">{{ al.title }}</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group" style="flex: 1">
          <Label>Title</Label>
          <Input v-model="title" required />
        </div>
        <div class="form-group" style="width: 80px">
          <Label>Track #</Label>
          <Input v-model="trackNumber" type="number" min="1" required />
        </div>
      </div>

      <div class="form-group">
        <Label>Audio File</Label>
        <input
          ref="fileInput"
          type="file"
          accept="audio/mpeg,audio/ogg,audio/flac,audio/wav,audio/aac"
          class="flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none cursor-pointer transition-colors file:bg-card file:border file:border-border file:rounded file:text-foreground file:text-xs file:font-semibold file:cursor-pointer file:px-3 file:py-1 file:mr-3 file:-my-1"
          @change="onFileChange"
          required
        />
      </div>

      <div v-if="durationSeconds > 0" class="text-[13px] text-dimmed">
        Duration detected: {{ formatDuration(durationSeconds) }}
      </div>

      <div v-if="loading" class="progress-wrap">
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" :style="{ width: uploadProgress + '%' }" />
        </div>
        <span class="text-[13px] text-dimmed">{{ uploadProgress }}%</span>
      </div>

      <Button type="submit" :disabled="loading">
        {{ loading ? 'Uploading…' : 'Upload track' }}
      </Button>
    </form>

    <div class="list-section">
      <h2 class="text-lg font-bold mb-4">All Tracks</h2>
      <div v-if="tracks.length === 0" class="text-[13px] text-dimmed">No tracks yet.</div>
      <div v-else class="item-list">
        <div v-for="t in tracks" :key="t.id" class="list-item">
          <span class="item-name">{{ t.trackNumber }}. {{ t.title }}</span>
          <span class="text-[13px] text-dimmed"
            >{{ t.artist.name }} — {{ t.album.title }} · {{ formatDuration(t.durationSeconds) }}</span
          >
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

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row { display: flex; gap: 12px; align-items: flex-end; }

select option { background: var(--muted); }

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bar-outer { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.progress-bar-inner { height: 100%; background: var(--primary); transition: width 0.2s; }

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: var(--card); border-radius: 4px; }
.item-name { font-weight: 600; }
</style>
