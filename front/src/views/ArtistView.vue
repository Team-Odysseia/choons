<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'

const route = useRoute()
const router = useRouter()
const music = useMusicStore()

onMounted(() => music.fetchArtist(route.params.id as string))
</script>

<template>
  <div v-if="!music.loading && music.currentArtist">
    <div class="artist-header">
      <div class="artist-avatar-lg">{{ music.currentArtist.name[0]?.toUpperCase() }}</div>
      <div>
        <div class="artist-label">Artist</div>
        <h1 class="page-title" style="margin-bottom: 8px">{{ music.currentArtist.name }}</h1>
        <p v-if="music.currentArtist.bio" class="artist-bio">{{ music.currentArtist.bio }}</p>
      </div>
    </div>

    <h2 class="section-title">Albums</h2>

    <div v-if="music.albums.length === 0" class="text-muted">No albums yet.</div>
    <div v-else class="grid-cards">
      <div
        v-for="album in music.albums"
        :key="album.id"
        class="card"
        @click="router.push(`/library/albums/${album.id}`)"
      >
        <div class="album-cover">♪</div>
        <div class="card-title">{{ album.title }}</div>
        <div class="card-sub">{{ album.releaseYear }}</div>
      </div>
    </div>
  </div>
  <div v-else class="text-muted">Loading…</div>
</template>

<style scoped>
.artist-header {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
}

.artist-avatar-lg {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  font-weight: 800;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.artist-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.artist-bio {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 500px;
  margin-top: 8px;
}

.album-cover {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-elevated);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  margin-bottom: 12px;
}
</style>
