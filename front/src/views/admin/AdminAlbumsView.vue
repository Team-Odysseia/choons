<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getArtists } from '@/api/artists'
import { getAlbums, createAlbum, deleteAlbum } from '@/api/albums'
import { uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import BaseDialog from '@/components/ui/dialog/BaseDialog.vue'
import draggable from 'vuedraggable'
import { GripVertical, X, Music, Pencil, Trash2 } from 'lucide-vue-next'

interface PendingTrack {
  uid: string
  file: File
  title: string
  durationSeconds: number
}

const router = useRouter()
const artists = ref<ArtistResponse[]>([])
const albums = ref<AlbumResponse[]>([])
const title = ref('')
const artistId = ref('')
const releaseYear = ref(new Date().getFullYear())
const loading = ref(false)
const uploadProgress = ref(0)
const uploadStatus = ref('')

const pendingTracks = ref<PendingTrack[]>([])
const isDragOver = ref(false)
const pendingCover = ref<File | null>(null)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)
const deletingId = ref<string | null>(null)
const confirmTarget = ref<AlbumResponse | null>(null)

onMounted(async () => {
  artists.value = await getArtists()
  albums.value = await getAlbums()
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
    audio.addEventListener('loadedmetadata', () => {
      resolve(Math.round(audio.duration))
      URL.revokeObjectURL(url)
    })
    audio.addEventListener('error', () => {
      resolve(0)
      URL.revokeObjectURL(url)
    })
  })
}

async function addFiles(files: FileList | File[]) {
  const audioTypes = ['audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/wav', 'audio/x-flac', 'audio/aac']
  for (const file of Array.from(files)) {
    if (!audioTypes.includes(file.type)) continue
    const durationSeconds = await getAudioDuration(file)
    pendingTracks.value.push({
      uid: crypto.randomUUID(),
      file,
      title: stripExtension(file.name),
      durationSeconds,
    })
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

function removeTrack(uid: string) {
  pendingTracks.value = pendingTracks.value.filter((t) => t.uid !== uid)
}

async function confirmDelete() {
  const al = confirmTarget.value
  if (!al) return
  confirmTarget.value = null
  deletingId.value = al.id
  try {
    await deleteAlbum(al.id)
    albums.value = albums.value.filter((a) => a.id !== al.id)
    toast.success(`"${al.title}" deleted`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to delete album')
  } finally {
    deletingId.value = null
  }
}

async function submit() {
  if (!title.value || !artistId.value) {
    toast.error('Please fill in all album fields')
    return
  }
  loading.value = true
  uploadProgress.value = 0
  try {
    const album = await createAlbum(title.value, artistId.value, releaseYear.value, pendingCover.value)

    if (pendingTracks.value.length > 0) {
      const total = pendingTracks.value.length
      for (let i = 0; i < total; i++) {
        const pt = pendingTracks.value[i]
        if (!pt) continue
        uploadStatus.value = `Uploading track ${i + 1} of ${total}…`
        uploadProgress.value = 0
        const formData = new FormData()
        formData.append('title', pt.title)
        formData.append('albumId', album.id)
        formData.append('artistId', artistId.value)
        formData.append('trackNumber', String(i + 1))
        formData.append('durationSeconds', String(pt.durationSeconds))
        formData.append('audioFile', pt.file)
        await uploadTrack(formData, (pct) => {
          uploadProgress.value = pct
        })
      }
      toast.success(`"${album.title}" created with ${total} track${total !== 1 ? 's' : ''}`)
    } else {
      toast.success(`Album "${album.title}" created`)
    }

    albums.value.unshift(album)
    title.value = ''
    artistId.value = ''
    releaseYear.value = new Date().getFullYear()
    pendingTracks.value = []
    pendingCover.value = null
    imageUploadRef.value?.reset()
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to create album')
  } finally {
    loading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Albums</h1>

    <form class="create-layout" @submit.prevent="submit">

      <!-- Left column: metadata -->
      <div class="admin-form">
        <h2 class="text-lg font-bold">Add Album</h2>

        <div class="form-group">
          <Label>Title</Label>
          <Input v-model="title" required />
        </div>
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
          <Label>Release Year</Label>
          <Input
            v-model="releaseYear"
            type="number"
            min="1900"
            :max="new Date().getFullYear() + 2"
            required
          />
        </div>

        <div class="form-group">
          <ImageUpload
            ref="imageUploadRef"
            label="Cover"
            @select="pendingCover = $event"
            @remove="pendingCover = null"
          />
        </div>

        <!-- Upload progress -->
        <div v-if="loading && uploadStatus" class="flex flex-col gap-1.5">
          <span class="text-[13px] text-dimmed">{{ uploadStatus }}</span>
          <div class="progress-wrap">
            <div class="progress-bar-outer">
              <div class="progress-bar-inner" :style="{ width: uploadProgress + '%' }" />
            </div>
            <span class="text-[13px] text-dimmed">{{ uploadProgress }}%</span>
          </div>
        </div>

        <Button type="submit" :disabled="loading">
          {{ loading ? (uploadProgress > 0 ? 'Uploading…' : 'Creating…') : 'Create Album' }}
        </Button>
      </div>

      <!-- Separator -->
      <div class="separator" />

      <!-- Right column: tracks -->
      <div class="tracks-column">

        <!-- Drop zone -->
        <div class="form-group">
          <Label>Tracks</Label>
          <div
            class="relative flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-8 text-center transition-colors cursor-pointer"
            :class="isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="onDrop"
            @click="($refs.fileInput as HTMLInputElement).click()"
          >
            <Music :size="28" class="text-dimmed" />
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

        <!-- Pending track list -->
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
                <span class="text-[12px] text-dimmed text-right">{{ index + 1 }}</span>
                <GripVertical :size="14" class="drag-handle text-dimmed cursor-grab active:cursor-grabbing" />
                <input
                  v-model="element.title"
                  class="bg-transparent border-none outline-none text-[13px] font-medium text-foreground w-full focus:bg-muted rounded px-1 -mx-1"
                />
                <span class="text-[12px] text-dimmed text-right">{{ formatDuration(element.durationSeconds) }}</span>
                <button
                  type="button"
                  class="flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  @click="removeTrack(element.uid)"
                >
                  <X :size="14" />
                </button>
              </div>
            </template>
          </draggable>
        </div>

      </div>
    </form>

    <!-- Albums list -->
    <div class="list-section">
      <h2 class="text-lg font-bold mb-4">All Albums</h2>
      <div v-if="albums.length === 0" class="text-[13px] text-dimmed">No albums yet.</div>
      <div v-else class="item-list">
        <div v-for="al in albums" :key="al.id" class="list-item">
          <div class="flex items-center justify-between gap-3">
            <span class="item-name">{{ al.title }}</span>
            <div class="flex items-center gap-1">
              <button
                class="shrink-0 size-7 rounded flex items-center justify-center text-dimmed hover:text-foreground hover:bg-muted transition-colors"
                title="Edit"
                @click="router.push(`/admin/albums/${al.id}/edit`)"
              >
                <Pencil :size="14" />
              </button>
              <button
                class="shrink-0 size-7 rounded flex items-center justify-center text-dimmed hover:text-destructive hover:bg-muted transition-colors"
                title="Delete"
                :disabled="deletingId === al.id"
                @click="confirmTarget = al"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <span class="text-[13px] text-dimmed">{{ al.artist.name }} · {{ al.releaseYear }}</span>
        </div>
      </div>
    </div>
  </div>

  <BaseDialog
    :open="!!confirmTarget"
    title="Delete Album"
    @close="confirmTarget = null"
  >
    <div class="px-5 pb-5">
      <p class="text-sm text-muted-foreground mb-5">
        Delete <span class="font-semibold text-foreground">{{ confirmTarget?.title }}</span>?
        This will permanently remove all its tracks from storage.
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="confirmTarget = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped>
.create-layout {
  display: flex;
  align-items: flex-start;
  gap: 0;
  margin-bottom: 40px;
}

.admin-form {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.separator {
  width: 1px;
  align-self: stretch;
  background: var(--border);
  margin: 0 32px;
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

.progress-wrap { display: flex; align-items: center; gap: 10px; }
.progress-bar-outer { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.progress-bar-inner { height: 100%; background: var(--primary); transition: width 0.2s; }

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: var(--card); border-radius: 4px; }
.item-name { font-weight: 600; }
</style>
