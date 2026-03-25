<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getArtists } from '@/api/artists'
import { getAlbums, createAlbum } from '@/api/albums'
import type { ArtistResponse, AlbumResponse } from '@/api/types'

const artists = ref<ArtistResponse[]>([])
const albums = ref<AlbumResponse[]>([])
const title = ref('')
const artistId = ref('')
const releaseYear = ref(new Date().getFullYear())
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  artists.value = await getArtists()
  albums.value = await getAlbums()
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const created = await createAlbum(title.value, artistId.value, releaseYear.value)
    albums.value.unshift(created)
    title.value = ''
    artistId.value = ''
    releaseYear.value = new Date().getFullYear()
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Failed to create album'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Albums</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="section-title">Add Album</h2>
      <div class="form-group">
        <label>Title</label>
        <input v-model="title" class="form-input" required />
      </div>
      <div class="form-group">
        <label>Artist</label>
        <select v-model="artistId" class="form-input" required>
          <option value="">Select artist…</option>
          <option v-for="a in artists" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Release Year</label>
        <input v-model.number="releaseYear" class="form-input" type="number" min="1900" :max="new Date().getFullYear() + 2" required />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Adding…' : 'Add album' }}
      </button>
    </form>

    <div class="list-section">
      <h2 class="section-title">All Albums</h2>
      <div v-if="albums.length === 0" class="text-muted">No albums yet.</div>
      <div v-else class="item-list">
        <div v-for="al in albums" :key="al.id" class="list-item">
          <span class="item-name">{{ al.title }}</span>
          <span class="text-muted">{{ al.artist.name }} · {{ al.releaseYear }}</span>
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

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius-sm); }
.item-name { font-weight: 600; }
</style>
