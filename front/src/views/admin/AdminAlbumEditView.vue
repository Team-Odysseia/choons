<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getAdminAlbum, updateAlbum, deleteAlbumCover, albumImageUrl } from '@/api/albums'
import { getArtists } from '@/api/artists'
import { getTracks, updateAlbumTracks, updateTrackLrclibId, deleteTrack, uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse, TrackResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import draggable from 'vuedraggable'
import { ArrowLeft, GripVertical, X, Music } from 'lucide-vue-next'

interface EditableTrack {
  id: string
  title: string
  durationSeconds: number
  originalTrackNumber: number
  lrclibId: number | null
  originalLrclibId: number | null
}

interface PendingTrack {
  uid: string
  file: File
  title: string
  durationSeconds: number
}

const route = useRoute()
const router = useRouter()

const album = ref<AlbumResponse | null>(null)
const artists = ref<ArtistResponse[]>([])
const tracks = ref<EditableTrack[]>([])
const pendingTracks = ref<PendingTrack[]>([])

const title = ref('')
const artistId = ref('')
const releaseYear = ref(new Date().getFullYear())

const loading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')
const isDragOver = ref(false)

const pendingCover = ref<File | null>(null)
const removeCover = ref(false)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)
const currentCoverUrl = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  try {
    const [albumData, artistsData, tracksData] = await Promise.all([
      getAdminAlbum(id),
      getArtists(),
      getTracks(id),
    ])
    album.value = albumData
    artists.value = artistsData
    title.value = albumData.title
    artistId.value = albumData.artist.id
    releaseYear.value = albumData.releaseYear
    currentCoverUrl.value = albumData.coverUrl ? albumImageUrl(albumData.id) : null
    tracks.value = tracksData.map((t) => ({
      id: t.id,
      title: t.title,
      durationSeconds: t.durationSeconds,
      originalTrackNumber: t.trackNumber,
      lrclibId: t.lrclibId,
      originalLrclibId: t.lrclibId,
    }))
  } catch {
    toast.error('Failed to load album')
    router.push('/admin/albums')
  }
})

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function stripExtension(name: string) {
  return name.replace(/\.[^/.]+$/, '')
}

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', () => { resolve(Math.round(audio.duration)); URL.revokeObjectURL(url) })
    audio.addEventListener('error', () => { resolve(0); URL.revokeObjectURL(url) })
  })
}

async function addFiles(files: FileList | File[]) {
  const audioTypes = ['audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/wav', 'audio/x-flac', 'audio/aac']
  for (const file of Array.from(files)) {
    if (!audioTypes.includes(file.type)) continue
    const durationSeconds = await getAudioDuration(file)
    pendingTracks.value.push({ uid: crypto.randomUUID(), file, title: stripExtension(file.name), durationSeconds })
  }
}

function onDropZoneChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) addFiles(files)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function removeExistingTrack(id: string) {
  tracks.value = tracks.value.filter((t) => t.id !== id)
}

function removePendingTrack(uid: string) {
  pendingTracks.value = pendingTracks.value.filter((t) => t.uid !== uid)
}

async function deleteExistingTrack(id: string) {
  try {
    await deleteTrack(id)
    removeExistingTrack(id)
    toast.success('Track deleted')
  } catch {
    toast.error('Failed to delete track')
  }
}

async function save() {
  if (!album.value) return
  loading.value = true
  uploadProgress.value = 0
  try {
    // 1. Remove cover if requested
    if (removeCover.value && !pendingCover.value) {
      await deleteAlbumCover(album.value.id)
    }

    // 2. Update album metadata (and optional cover)
    const fd = new FormData()
    fd.append('title', title.value)
    fd.append('artistId', artistId.value)
    fd.append('releaseYear', String(releaseYear.value))
    if (pendingCover.value) fd.append('coverFile', pendingCover.value)
    const updated = await updateAlbum(album.value.id, fd)
    album.value = updated
    currentCoverUrl.value = updated.coverUrl ? albumImageUrl(updated.id) : null
    pendingCover.value = null
    removeCover.value = false
    imageUploadRef.value?.reset()

    // 3. Update existing tracks (title + order)
    if (tracks.value.length > 0) {
      // Capture pending lrclib changes before the array is rebuilt
      const lrclibChanges = tracks.value
        .filter((t) => t.lrclibId !== t.originalLrclibId)
        .map((t) => ({ id: t.id, lrclibId: t.lrclibId }))

      const trackUpdates = tracks.value.map((t, i) => ({
        id: t.id,
        title: t.title,
        trackNumber: i + 1,
      }))
      const updatedTracks = await updateAlbumTracks(album.value.id, trackUpdates)
      tracks.value = updatedTracks.map((t) => {
        const changed = lrclibChanges.find((c) => c.id === t.id)
        const lrclibId = changed !== undefined ? changed.lrclibId : t.lrclibId
        return {
          id: t.id,
          title: t.title,
          durationSeconds: t.durationSeconds,
          originalTrackNumber: t.trackNumber,
          lrclibId,
          originalLrclibId: lrclibId,
        }
      })

      // Apply lrclib ID changes
      if (lrclibChanges.length > 0) {
        await Promise.all(lrclibChanges.map((c) => updateTrackLrclibId(c.id, c.lrclibId)))
      }
    }

    // 4. Upload new tracks
    if (pendingTracks.value.length > 0) {
      const total = pendingTracks.value.length
      const startNumber = tracks.value.length + 1
      for (let i = 0; i < total; i++) {
        const pt = pendingTracks.value[i]
        if (!pt) continue
        uploadStatus.value = `Uploading track ${i + 1} of ${total}…`
        uploadProgress.value = 0
        const formData = new FormData()
        formData.append('title', pt.title)
        formData.append('albumId', album.value.id)
        formData.append('artistId', artistId.value)
        formData.append('trackNumber', String(startNumber + i))
        formData.append('durationSeconds', String(pt.durationSeconds))
        formData.append('audioFile', pt.file)
        const newTrack = await uploadTrack(formData, (pct) => { uploadProgress.value = pct })
        tracks.value.push({ id: newTrack.id, title: newTrack.title, durationSeconds: newTrack.durationSeconds, originalTrackNumber: newTrack.trackNumber, lrclibId: newTrack.lrclibId, originalLrclibId: newTrack.lrclibId })
      }
      pendingTracks.value = []
    }

    toast.success(`Album "${updated.title}" saved`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to save album')
  } finally {
    loading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}
</script>

<template>
  <div v-if="album">
    <button
      class="flex items-center gap-1.5 text-[13px] text-dimmed hover:text-foreground transition-colors mb-6"
      @click="router.push('/admin/albums')"
    >
      <ArrowLeft :size="14" />
      Back to albums
    </button>

    <h1 class="text-[28px] font-extrabold mb-6">Edit Album</h1>

    <form class="edit-layout" @submit.prevent="save">

      <!-- Left column: metadata -->
      <div class="admin-form">
        <div class="form-group">
          <Label>Title</Label>
          <Input v-model="title" required />
        </div>

        <div class="form-group">
          <Label>Artist</Label>
          <select
            v-model="artistId"
            class="flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
            required
          >
            <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <Label>Release Year</Label>
          <Input v-model="releaseYear" type="number" min="1900" :max="new Date().getFullYear() + 2" required />
        </div>

        <div class="form-group">
          <ImageUpload
            ref="imageUploadRef"
            :current-url="currentCoverUrl"
            label="Cover"
            @select="pendingCover = $event; removeCover = false"
            @remove="pendingCover = null; removeCover = true"
          />
        </div>

        <!-- Upload progress -->
        <div v-if="loading && uploadStatus" class="flex flex-col gap-1.5">
          <span class="text-[13px] text-dimmed">{{ uploadStatus }}</span>
          <div class="flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
              <div class="h-full bg-primary transition-all duration-200" :style="{ width: uploadProgress + '%' }" />
            </div>
            <span class="text-[12px] text-dimmed shrink-0">{{ uploadProgress }}%</span>
          </div>
        </div>

        <Button type="submit" :disabled="loading">
          {{ loading ? (uploadProgress > 0 ? 'Uploading…' : 'Saving…') : 'Save changes' }}
        </Button>
      </div>

      <!-- Separator -->
      <div class="separator" />

      <!-- Right column: tracks -->
      <div class="tracks-column">

        <!-- Existing tracks -->
        <div v-if="tracks.length > 0" class="form-group">
          <Label>Tracks</Label>
          <div class="flex flex-col gap-1 mt-1">
            <div class="grid [grid-template-columns:24px_24px_1fr_80px_52px_28px] items-center gap-2 px-2 pb-1 border-b border-border">
              <span class="text-[11px] text-dimmed text-right">#</span>
              <span></span>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed">Title</span>
              <a
                href="https://lrclib.net/search"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] font-semibold uppercase tracking-wider text-dimmed hover:text-primary transition-colors"
                title="Search on lrclib.net"
              >Lyrics ID ↗</a>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed text-right">Time</span>
              <span></span>
            </div>
            <draggable v-model="tracks" item-key="id" handle=".drag-handle">
              <template #item="{ element, index }">
                <div class="grid [grid-template-columns:24px_24px_1fr_80px_52px_28px] items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 group">
                  <span class="text-[12px] text-dimmed text-right">{{ index + 1 }}</span>
                  <GripVertical :size="14" class="drag-handle text-dimmed cursor-grab active:cursor-grabbing" />
                  <input
                    v-model="element.title"
                    class="bg-transparent border-none outline-none text-[13px] font-medium text-foreground w-full focus:bg-muted rounded px-1 -mx-1"
                  />
                  <input
                    v-model.number="element.lrclibId"
                    type="number"
                    class="no-spinner bg-transparent border-none outline-none text-[12px] text-dimmed w-full focus:bg-muted rounded px-1 -mx-1"
                    placeholder="—"
                  />
                  <span class="text-[12px] text-dimmed text-right">{{ formatDuration(element.durationSeconds) }}</span>
                  <button
                    type="button"
                    class="flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                    @click="deleteExistingTrack(element.id)"
                  >
                    <X :size="14" />
                  </button>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <!-- Add new tracks drop zone -->
        <div class="form-group">
          <Label>Add more tracks</Label>
          <div
            class="relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer"
            :class="isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="onDrop"
            @click="($refs.fileInput as HTMLInputElement).click()"
          >
            <Music :size="24" class="text-dimmed" />
            <span class="text-[13px] text-muted-foreground">Drop audio files here, or click to browse</span>
            <span class="text-[11px] text-dimmed">MP3, FLAC, OGG, WAV, AAC</span>
            <input
              ref="fileInput"
              type="file"
              accept="audio/mpeg,audio/ogg,audio/flac,audio/wav,audio/aac"
              multiple
              class="hidden"
              @change="onDropZoneChange"
            />
          </div>
        </div>

        <!-- Pending new tracks -->
        <div v-if="pendingTracks.length > 0" class="flex flex-col gap-1">
          <div class="grid [grid-template-columns:24px_24px_1fr_52px_28px] items-center gap-2 px-2 pb-1 border-b border-border">
            <span class="text-[11px] text-dimmed text-right">#</span>
            <span></span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed">Title</span>
            <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed text-right">Time</span>
            <span></span>
          </div>
          <draggable v-model="pendingTracks" item-key="uid" handle=".drag-handle">
            <template #item="{ element, index }">
              <div class="grid [grid-template-columns:24px_24px_1fr_52px_28px] items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 group">
                <span class="text-[12px] text-dimmed text-right">{{ tracks.length + index + 1 }}</span>
                <GripVertical :size="14" class="drag-handle text-dimmed cursor-grab active:cursor-grabbing" />
                <input
                  v-model="element.title"
                  class="bg-transparent border-none outline-none text-[13px] font-medium text-foreground w-full focus:bg-muted rounded px-1 -mx-1"
                />
                <span class="text-[12px] text-dimmed text-right">{{ formatDuration(element.durationSeconds) }}</span>
                <button
                  type="button"
                  class="flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  @click="removePendingTrack(element.uid)"
                >
                  <X :size="14" />
                </button>
              </div>
            </template>
          </draggable>
        </div>

      </div>
    </form>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>

<style scoped>
.edit-layout {
  display: grid;
  grid-template-columns: minmax(320px, 500px) minmax(0, 1fr);
  align-items: start;
  gap: 24px;
}

.admin-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.separator {
  display: none;
  width: 1px;
  align-self: stretch;
  background: var(--border);
}

.tracks-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
select option { background: var(--muted); }

.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.no-spinner { -moz-appearance: textfield; }

@media (max-width: 1023px) {
  .edit-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (min-width: 1024px) {
  .edit-layout {
    grid-template-columns: minmax(320px, 460px) 1px minmax(0, 1fr);
    gap: 0;
  }

  .separator {
    display: block;
    margin: 0 24px;
  }
}
</style>
