<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getArtists, createArtist } from '@/api/artists'
import type { ArtistResponse } from '@/api/types'

const artists = ref<ArtistResponse[]>([])
const name = ref('')
const bio = ref('')
const loading = ref(false)
const error = ref('')

onMounted(load)

async function load() {
  artists.value = await getArtists()
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const created = await createArtist(name.value, bio.value)
    artists.value.unshift(created)
    name.value = ''
    bio.value = ''
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Failed to create artist'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Artists</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="section-title">Add Artist</h2>
      <div class="form-group">
        <label>Name</label>
        <input v-model="name" class="form-input" required />
      </div>
      <div class="form-group">
        <label>Bio</label>
        <textarea v-model="bio" class="form-input" rows="3" />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Adding…' : 'Add artist' }}
      </button>
    </form>

    <div class="list-section">
      <h2 class="section-title">All Artists</h2>
      <div v-if="artists.length === 0" class="text-muted">No artists yet.</div>
      <div v-else class="item-list">
        <div v-for="a in artists" :key="a.id" class="list-item">
          <span class="item-name">{{ a.name }}</span>
          <span class="text-muted">{{ a.bio?.slice(0, 60) }}{{ (a.bio?.length ?? 0) > 60 ? '…' : '' }}</span>
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

textarea.form-input { resize: vertical; }

.list-section { margin-top: 8px; }

.item-list { display: flex; flex-direction: column; gap: 4px; }

.list-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
}

.item-name { font-weight: 600; }
</style>
