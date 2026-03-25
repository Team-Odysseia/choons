<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'

const router = useRouter()
const playlists = usePlaylistsStore()

const newName = ref('')
const creating = ref(false)
const showForm = ref(false)

onMounted(() => playlists.fetchMyPlaylists())

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const pl = await playlists.createPlaylist(newName.value.trim())
    newName.value = ''
    showForm.value = false
    router.push(`/playlists/${pl.id}`)
  } finally {
    creating.value = false
  }
}

async function remove(id: string, name: string) {
  if (!confirm(`Delete "${name}"?`)) return
  await playlists.deletePlaylist(id)
}
</script>

<template>
  <div>
    <div class="playlists-header">
      <h1 class="page-title" style="margin-bottom: 0">Playlists</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">+ New playlist</button>
    </div>

    <form v-if="showForm" class="new-playlist-form" @submit.prevent="create">
      <input
        v-model="newName"
        class="form-input"
        placeholder="Playlist name"
        autofocus
        required
      />
      <button type="submit" class="btn btn-primary" :disabled="creating">Create</button>
      <button type="button" class="btn btn-ghost" @click="showForm = false">Cancel</button>
    </form>

    <div v-if="playlists.loading" class="text-muted" style="margin-top: 16px">Loading…</div>

    <div v-else-if="playlists.playlists.length === 0" class="text-muted" style="margin-top: 16px">
      No playlists yet. Create one!
    </div>

    <div v-else class="playlist-list">
      <div
        v-for="pl in playlists.playlists"
        :key="pl.id"
        class="playlist-item"
        @click="router.push(`/playlists/${pl.id}`)"
      >
        <div class="playlist-icon">♫</div>
        <div class="playlist-meta">
          <span class="playlist-name">{{ pl.name }}</span>
          <span class="text-muted">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
        </div>
        <button
          class="btn-icon delete-btn"
          @click.stop="remove(pl.id, pl.name)"
          title="Delete"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playlists-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.new-playlist-form {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  align-items: center;
}

.new-playlist-form .form-input {
  max-width: 280px;
}

.playlist-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 0.1s;
}

.playlist-item:hover { background: var(--bg-card); }

.playlist-icon {
  width: 48px;
  height: 48px;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.playlist-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.playlist-name {
  font-weight: 600;
  font-size: 15px;
}

.delete-btn {
  opacity: 0;
  color: var(--text-muted);
  transition: opacity 0.1s, color 0.1s;
}

.playlist-item:hover .delete-btn { opacity: 1; }
.delete-btn:hover { color: var(--danger); }
</style>
