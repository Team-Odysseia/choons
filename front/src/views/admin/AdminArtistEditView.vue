<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getAdminArtist, updateArtist, deleteArtistAvatar, artistImageUrl } from '@/api/artists'
import type { ArtistResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUpload from '@/components/admin/ImageUpload.vue'
import { ArrowLeft } from 'lucide-vue-next'

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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to save artist')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="artist">
    <button
      class="flex items-center gap-1.5 text-[13px] text-dimmed hover:text-foreground transition-colors mb-6"
      @click="router.push('/admin/artists')"
    >
      <ArrowLeft :size="14" />
      Back to artists
    </button>

    <h1 class="text-[28px] font-extrabold mb-6">Edit Artist</h1>

    <form class="admin-form" @submit.prevent="save">
      <div class="form-group">
        <Label>Name</Label>
        <Input v-model="name" required />
      </div>

      <div class="form-group">
        <Label>Bio</Label>
        <textarea
          v-model="bio"
          class="flex w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary resize-y"
          rows="3"
        />
      </div>

      <div class="form-group">
        <ImageUpload
          ref="imageUploadRef"
          :current-url="currentAvatarUrl"
          label="Avatar"
          @select="pendingAvatar = $event; removeAvatar = false"
          @remove="pendingAvatar = null; removeAvatar = true"
        />
      </div>

      <Button type="submit" :disabled="loading">
        {{ loading ? 'Saving…' : 'Save changes' }}
      </Button>
    </form>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>

<style scoped>
.admin-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
