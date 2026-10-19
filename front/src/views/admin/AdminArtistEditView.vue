<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { getAdminArtist, updateArtist, deleteArtistAvatar, artistImageUrl } from '@/api/artists'
import type { ArtistResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import { PageHeader, StatePlate, VfdTextarea } from '@/components/vfd'
import { ArrowLeft, Save } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const artist = ref<ArtistResponse | null>(null)
const name = ref('')
const bio = ref('')
const loading = ref(false)
const pendingAvatar = ref<File | null>(null)
const removeAvatar = ref(false)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)

const currentAvatarUrl = ref<string | null>(null)

onMounted(async () => {
  try {
    artist.value = await getAdminArtist(route.params.id as string)
    name.value = artist.value.name
    bio.value = artist.value.bio ?? ''
    currentAvatarUrl.value = artist.value.avatarUrl
      ? artistImageUrl(artist.value.id)
      : null
  } catch {
    toast.error('Failed to load artist')
    router.push('/admin/artists')
  }
})

async function save() {
  if (!artist.value) return
  loading.value = true
  try {
    if (removeAvatar.value && !pendingAvatar.value) {
      await deleteArtistAvatar(artist.value.id)
    }

    const fd = new FormData()
    fd.append('name', name.value)
    fd.append('bio', bio.value)
    if (pendingAvatar.value) fd.append('avatarFile', pendingAvatar.value)

    const updated = await updateArtist(artist.value.id, fd)
    artist.value = updated
    currentAvatarUrl.value = updated.avatarUrl ? artistImageUrl(updated.id) : null
    pendingAvatar.value = null
    removeAvatar.value = false
    imageUploadRef.value?.reset()

    toast.success(`Artist "${updated.name}" saved`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to save artist'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="artist" class="flex flex-col gap-6">
    <Button variant="ghost" size="sm" class="self-start px-0" @click="router.push('/admin/artists')">
      <template #icon><ArrowLeft :size="13" aria-hidden="true" /></template>
      Back to artists
    </Button>

    <PageHeader kicker="Admin · Artists · Edit" title="Edit Artist" />

    <form
      class="flex flex-col gap-7 rounded-lg border border-chrome-lo/40 bg-[linear-gradient(to_top,#0A0F12,#141B20)] p-6 shadow-[0_10px_24px_#000000cc] md:flex-row md:p-7"
      @submit.prevent="save"
    >
      <div class="flex flex-1 flex-col gap-[18px]">
        <div class="flex flex-col gap-2">
          <Label for="edit-artist-name">Name</Label>
          <Input id="edit-artist-name" v-model="name" required />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="edit-artist-bio">Bio</Label>
          <VfdTextarea id="edit-artist-bio" v-model="bio" class="min-h-[150px]" />
        </div>
        <div class="flex justify-end">
          <Button type="submit" :disabled="loading">
            <template #icon><Save :size="13" aria-hidden="true" /></template>
            {{ loading ? 'Saving…' : 'Save changes' }}
          </Button>
        </div>
      </div>
      <div class="md:w-[240px]">
        <ImageUpload
          ref="imageUploadRef"
          :current-url="currentAvatarUrl"
          label="Avatar"
          @select="pendingAvatar = $event; removeAvatar = false"
          @remove="pendingAvatar = null; removeAvatar = true"
        />
      </div>
    </form>
  </div>
  <StatePlate v-else kind="loading" code="READING…" message="Loading…" />
</template>
