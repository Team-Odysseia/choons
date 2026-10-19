<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { getAdminAlbum, updateAlbum, deleteAlbumCover, albumImageUrl } from '@/api/albums'
import { getAdminArtists } from '@/api/artists'
import { getAdminTracks, updateAlbumTracks, updateTrackLrclibId, deleteTrack, uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse, TrackResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import draggable from 'vuedraggable'
import { ArrowLeft, Save } from 'lucide-vue-next'
import AudioDropZone from '@/components/admin/AudioDropZone.vue'
import EditTrackRow from '@/components/admin/EditTrackRow.vue'
import { LedBar, PageHeader, StatePlate, VfdSelect } from '@/components/vfd'

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

const pendingCover = ref<File | null>(null)
const removeCover = ref(false)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)
const currentCoverUrl = ref<string | null>(null)

onMounted(async () => {
  const id = route.params.id as string
  try {
    const albumData = await getAdminAlbum(id)
    const artistsData = await getAdminArtists()
    const tracksData = await getAdminTracks(id)
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

function onFiles(files: File[]) {
  void addFiles(files)
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
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to save album'))
  } finally {
    loading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}
</script>

<template>
  <div v-if="album" class="flex flex-col gap-5">
    <Button variant="ghost" size="sm" class="self-start px-0" @click="router.push('/admin/albums')">
      <template #icon><ArrowLeft :size="13" aria-hidden="true" /></template>
      Back to albums
    </Button>

    <PageHeader kicker="Admin · Albums · Edit" title="Edit Album" />

    <form class="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]" @submit.prevent="save">
      <div
        class="flex flex-col gap-4 rounded-lg border border-chrome-lo/40 bg-[linear-gradient(to_top,#0A0F12,#141B20)] p-[22px] shadow-[0_10px_24px_#000000cc]"
      >
        <div class="flex flex-col gap-2">
          <Label for="edit-album-title">Title</Label>
          <Input id="edit-album-title" v-model="title" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="edit-album-artist">Artist</Label>
          <VfdSelect id="edit-album-artist" v-model="artistId" required>
            <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
          </VfdSelect>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="edit-album-year">Release Year</Label>
          <Input id="edit-album-year" v-model="releaseYear" type="number" min="1900" :max="new Date().getFullYear() + 2" required />
        </div>
        <ImageUpload
          ref="imageUploadRef"
          :current-url="currentCoverUrl"
          label="Cover"
          @select="pendingCover = $event; removeCover = false"
          @remove="pendingCover = null; removeCover = true"
        />
        <div v-if="loading && uploadStatus" class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="font-label text-[9px] uppercase tracking-[0.2em] text-amber">{{ uploadStatus }}</span>
            <span class="font-display text-base font-extrabold text-amber glow-amber">{{ uploadProgress }}%</span>
          </div>
          <LedBar :value="uploadProgress" :max="100" :segments="40" tone="amber" />
        </div>
        <Button type="submit" :disabled="loading" class="w-full">
          <template #icon><Save :size="13" aria-hidden="true" /></template>
          {{ loading ? (uploadProgress > 0 ? 'Uploading…' : 'Saving…') : 'Save changes' }}
        </Button>
      </div>

      <div class="flex min-w-0 flex-col gap-3.5">
        <template v-if="tracks.length > 0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-display text-[22px] font-extrabold uppercase text-cyan glow-sm">Tracks · {{ String(tracks.length).padStart(2, '0') }}</span>
            <a
              href="https://lrclib.net/search"
              target="_blank"
              rel="noopener noreferrer"
              class="text-xs text-faint transition-colors hover:text-cyan"
              title="Search on lrclib.net"
            >drag to reorder · lyrics id from lrclib.net ↗</a>
          </div>
          <div class="rounded-md border border-line bg-panel py-1">
            <draggable v-model="tracks" item-key="id" handle=".drag-handle">
              <template #item="{ element, index }">
                <EditTrackRow
                  :index="index"
                  :title="element.title"
                  :lyrics-id="element.lrclibId"
                  :duration="element.durationSeconds"
                  show-lyrics
                  @update:title="element.title = $event"
                  @update:lyrics-id="element.lrclibId = $event"
                  @remove="deleteExistingTrack(element.id)"
                />
              </template>
            </draggable>
          </div>
        </template>

        <AudioDropZone title="Add more tracks" @files="onFiles" />

        <template v-if="pendingTracks.length > 0">
          <span class="font-label text-[10px] uppercase tracking-[0.2em] text-amber">Pending tracks · {{ pendingTracks.length }}</span>
          <div class="rounded-md border border-amber-ghost bg-panel py-1">
            <draggable v-model="pendingTracks" item-key="uid" handle=".drag-handle">
              <template #item="{ element, index }">
                <EditTrackRow
                  :index="tracks.length + index"
                  :title="element.title"
                  :duration="element.durationSeconds"
                  @update:title="element.title = $event"
                  @remove="removePendingTrack(element.uid)"
                />
              </template>
            </draggable>
          </div>
        </template>
      </div>
    </form>
  </div>
  <StatePlate v-else kind="loading" code="READING…" message="Loading…" />
</template>
