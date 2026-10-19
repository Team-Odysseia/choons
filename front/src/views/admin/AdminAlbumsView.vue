<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { getAdminArtists } from '@/api/artists'
import { getAdminAlbums, searchAlbums, createAlbum, deleteAlbum, albumImageUrl } from '@/api/albums'
import { uploadTrack } from '@/api/tracks'
import type { ArtistResponse, AlbumResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import BaseDialog from '@/components/ui/dialog/BaseDialog.vue'
import draggable from 'vuedraggable'
import AdminRow from '@/components/admin/AdminRow.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import AudioDropZone from '@/components/admin/AudioDropZone.vue'
import EditTrackRow from '@/components/admin/EditTrackRow.vue'
import { LedBar, StatePlate, VfdSelect } from '@/components/vfd'

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
const pendingCover = ref<File | null>(null)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)
const deletingId = ref<string | null>(null)
const confirmTarget = ref<AlbumResponse | null>(null)
const addDialogOpen = ref(false)
const search = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  try {
    artists.value = await getAdminArtists()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load artists'))
  }
  await loadAlbums()
})

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})

watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    void loadAlbums()
  }, 220)
})

async function loadAlbums() {
  const query = search.value.trim()
  try {
    albums.value = query ? await searchAlbums(query, { page: 0, size: 200 }) : await getAdminAlbums()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load albums'))
  }
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

function onFiles(files: File[]) {
  void addFiles(files)
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
    await loadAlbums()
    toast.success(`"${al.title}" deleted`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to delete album'))
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

    await loadAlbums()
    title.value = ''
    artistId.value = ''
    releaseYear.value = new Date().getFullYear()
    pendingTracks.value = []
    pendingCover.value = null
    imageUploadRef.value?.reset()
    addDialogOpen.value = false
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to create album'))
  } finally {
    loading.value = false
    uploadProgress.value = 0
    uploadStatus.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      kicker="Admin · Albums"
      :title="`Albums (${albums.length})`"
      :total="albums.length"
      add-label="Add Album"
      @add="addDialogOpen = true"
    />

    <Input v-model="search" class="sm:max-w-[520px]" placeholder="Search album or artist" />

    <StatePlate v-if="albums.length === 0" code="NO MATCH" message="No albums found." />
    <div v-else class="flex flex-col gap-2">
      <AdminRow
        v-for="al in albums"
        :key="al.id"
        :primary="al.title"
        :secondary="`${al.artist.name} · ${al.releaseYear}`"
        :thumb="al.coverUrl ? albumImageUrl(al.id) : null"
        round
        :deleting="deletingId === al.id"
        @edit="router.push(`/admin/albums/${al.id}/edit`)"
        @delete="confirmTarget = al"
      />
    </div>
  </div>

  <BaseDialog :open="addDialogOpen" title="Add Album" max-width-class="max-w-[1120px]" @close="addDialogOpen = false">
    <form
      data-testid="create-album-form"
      class="grid gap-6 px-5 pb-5 md:grid-cols-[340px_minmax(0,1fr)]"
      @submit.prevent="submit"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="album-title">Title</Label>
          <Input id="album-title" v-model="title" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="album-artist">Artist</Label>
          <VfdSelect id="album-artist" v-model="artistId" required>
            <option value="">Select artist…</option>
            <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
          </VfdSelect>
        </div>
        <div class="flex flex-col gap-2">
          <Label for="album-year">Release Year</Label>
          <Input
            id="album-year"
            v-model="releaseYear"
            type="number"
            min="1900"
            :max="new Date().getFullYear() + 2"
            required
          />
        </div>
        <ImageUpload
          ref="imageUploadRef"
          label="Cover"
          @select="pendingCover = $event"
          @remove="pendingCover = null"
        />
        <div v-if="loading && uploadStatus" class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="font-label text-[9px] uppercase tracking-[0.2em] text-amber">{{ uploadStatus }}</span>
            <span class="font-display text-base font-extrabold text-amber glow-amber">{{ uploadProgress }}%</span>
          </div>
          <LedBar :value="uploadProgress" :max="100" :segments="40" tone="amber" />
        </div>
        <div class="mt-1 flex justify-end gap-2">
          <Button type="button" variant="ghost" @click="addDialogOpen = false">Cancel</Button>
          <Button type="submit" :disabled="loading">
            {{ loading ? (uploadProgress > 0 ? 'Uploading…' : 'Creating…') : 'Create Album' }}
          </Button>
        </div>
      </div>

      <div class="flex min-w-0 flex-col gap-3">
        <Label>Tracks</Label>
        <AudioDropZone title="Drop audio files here, or click to browse" @files="onFiles" />
        <template v-if="pendingTracks.length > 0">
          <span class="font-label text-[10px] uppercase tracking-[0.2em] text-amber">Pending tracks · {{ pendingTracks.length }}</span>
          <div class="rounded-md border border-line bg-panel py-1">
            <draggable v-model="pendingTracks" item-key="uid" handle=".drag-handle">
              <template #item="{ element, index }">
                <EditTrackRow
                  :index="index"
                  :title="element.title"
                  :duration="element.durationSeconds"
                  @update:title="element.title = $event"
                  @remove="removeTrack(element.uid)"
                />
              </template>
            </draggable>
          </div>
        </template>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!confirmTarget" title="Delete Album" tone="red" @close="confirmTarget = null">
    <div class="flex flex-col gap-4 px-5 pb-5">
      <p class="text-sm text-soft">
        Delete <span class="text-fg">{{ confirmTarget?.title }}</span>?
      </p>
      <p class="rounded border border-red bg-red-ghost px-3 py-2.5 text-[13px] text-red">
        This will permanently remove all its tracks from storage.
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="confirmTarget = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>
