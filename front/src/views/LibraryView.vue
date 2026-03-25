<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'

const music = useMusicStore()
const router = useRouter()

onMounted(() => music.fetchArtists())
</script>

<template>
  <div>
    <h1 class="page-title">Library</h1>

    <div v-if="music.loading" class="text-muted">Loading…</div>

    <div v-else-if="music.artists.length === 0" class="text-muted">
      No artists yet. Ask an admin to add some music.
    </div>

    <div v-else>
      <h2 class="section-title">Artists</h2>
      <div class="grid-cards">
        <div
          v-for="artist in music.artists"
          :key="artist.id"
          class="card"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <div class="artist-avatar">{{ artist.name[0]?.toUpperCase() }}</div>
          <div class="card-title">{{ artist.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.artist-avatar {
  width: 100%;
  aspect-ratio: 1;
  background: var(--bg-elevated);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 800;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
</style>
