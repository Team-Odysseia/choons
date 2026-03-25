<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { getArtists } from '@/api/artists'
import { getAlbums, createAlbum } from '@/api/albums'
import type { ArtistResponse, AlbumResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const artists = ref<ArtistResponse[]>([])
const albums = ref<AlbumResponse[]>([])
const title = ref('')
const artistId = ref('')
const releaseYear = ref(new Date().getFullYear())
const loading = ref(false)

onMounted(async () => {
  artists.value = await getArtists()
  albums.value = await getAlbums()
})

async function submit() {
  loading.value = true
  try {
    const created = await createAlbum(title.value, artistId.value, releaseYear.value)
    albums.value.unshift(created)
    title.value = ''
    artistId.value = ''
    releaseYear.value = new Date().getFullYear()
    toast.success(`Album "${created.title}" created successfully`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to create album')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Albums</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="text-lg font-bold mb-4">Add Album</h2>
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
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Adding…' : 'Add album' }}
      </Button>
    </form>

    <div class="list-section">
      <h2 class="text-lg font-bold mb-4">All Albums</h2>
      <div v-if="albums.length === 0" class="text-[13px] text-dimmed">No albums yet.</div>
      <div v-else class="item-list">
        <div v-for="al in albums" :key="al.id" class="list-item">
          <span class="item-name">{{ al.title }}</span>
          <span class="text-[13px] text-dimmed">{{ al.artist.name }} · {{ al.releaseYear }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-form {
  max-width: 440px;
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

select option { background: var(--muted); }

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: var(--card); border-radius: 4px; }
.item-name { font-weight: 600; }
</style>
