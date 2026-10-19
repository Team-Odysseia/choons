<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { getAdminArtists, searchArtists, createArtist, deleteArtist, artistImageUrl } from '@/api/artists'
import type { ArtistResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import BaseDialog from '@/components/ui/dialog/BaseDialog.vue'
import AdminRow from '@/components/admin/AdminRow.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { StatePlate, VfdTextarea } from '@/components/vfd'

const router = useRouter()
const artists = ref<ArtistResponse[]>([])
const name = ref('')
const bio = ref('')
const loading = ref(false)
const deletingId = ref<string | null>(null)
const confirmTarget = ref<ArtistResponse | null>(null)
const pendingAvatar = ref<File | null>(null)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)
const addDialogOpen = ref(false)
const search = ref('')

function shortBio(bio: string | null) {
  if (!bio) return undefined
  return bio.length > 60 ? `${bio.slice(0, 60)}…` : bio
}
let searchDebounce: ReturnType<typeof setTimeout> | null = null

onMounted(load)
onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})

watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    void load()
  }, 220)
})

async function load() {
  const query = search.value.trim()
  try {
    artists.value = query ? await searchArtists(query, 0, 200) : await getAdminArtists()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load artists'))
  }
}

async function confirmDelete() {
  const artist = confirmTarget.value
  if (!artist) return
  confirmTarget.value = null
    deletingId.value = artist.id
    try {
      await deleteArtist(artist.id)
      await load()
      toast.success(`"${artist.name}" deleted`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to delete artist'))
  } finally {
    deletingId.value = null
  }
}

async function submit() {
  loading.value = true
  try {
    const created = await createArtist(name.value, bio.value, pendingAvatar.value)
    await load()
    name.value = ''
    bio.value = ''
    pendingAvatar.value = null
    imageUploadRef.value?.reset()
    addDialogOpen.value = false
    toast.success(`Artist "${created.name}" created successfully`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to create artist'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      kicker="Admin · Artists"
      :title="`Artists (${artists.length})`"
      :total="artists.length"
      add-label="Add Artist"
      @add="addDialogOpen = true"
    />

    <Input v-model="search" class="sm:max-w-[520px]" placeholder="Search artist by name" />

    <StatePlate v-if="artists.length === 0" code="NO MATCH" message="No artists found." />
    <div v-else class="flex flex-col gap-2">
      <AdminRow
        v-for="a in artists"
        :key="a.id"
        :primary="a.name"
        :secondary="shortBio(a.bio)"
        :thumb="a.avatarUrl ? artistImageUrl(a.id) : null"
        round
        :deleting="deletingId === a.id"
        @edit="router.push(`/admin/artists/${a.id}/edit`)"
        @delete="confirmTarget = a"
      />
    </div>
  </div>

  <BaseDialog :open="addDialogOpen" title="Add Artist" max-width-class="max-w-[560px]" @close="addDialogOpen = false">
    <form data-testid="admin-form" class="flex flex-col gap-4 px-5 pb-5" @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <Label for="artist-name">Name</Label>
        <Input id="artist-name" v-model="name" required />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="artist-bio">Bio</Label>
        <VfdTextarea id="artist-bio" v-model="bio" placeholder="Write a short bio…" />
      </div>
      <ImageUpload
        ref="imageUploadRef"
        label="Avatar"
        @select="pendingAvatar = $event"
        @remove="pendingAvatar = null"
      />
      <div class="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" @click="addDialogOpen = false">Cancel</Button>
        <Button type="submit" :disabled="loading">{{ loading ? 'Adding…' : 'Add artist' }}</Button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!confirmTarget" title="Delete Artist" tone="red" @close="confirmTarget = null">
    <div class="flex flex-col gap-4 px-5 pb-5">
      <p class="text-sm text-soft">
        Delete <span class="text-fg">{{ confirmTarget?.name }}</span>?
      </p>
      <p class="rounded border border-red bg-red-ghost px-3 py-2.5 text-[13px] text-red">
        This will permanently remove all their albums and tracks from storage.
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="confirmTarget = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>
