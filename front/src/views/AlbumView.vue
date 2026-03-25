<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import TrackRow from '@/components/music/TrackRow.vue'

const route = useRoute()
const router = useRouter()
const music = useMusicStore()
const player = usePlayerStore()
const playlists = usePlaylistsStore()

onMounted(async () => {
  await music.fetchAlbum(route.params.id as string)
  await playlists.fetchMyPlaylists()
})
</script>

<template>
  <div v-if="!music.loading && music.currentAlbum">
    <div class="album-header">
      <div class="album-cover-lg">♪</div>
      <div>
        <div class="album-label">Album</div>
        <h1 class="page-title" style="margin-bottom: 4px">{{ music.currentAlbum.title }}</h1>
        <div class="album-meta">
          <span
            class="album-artist-link"
            @click="router.push(`/library/artists/${music.currentAlbum.artist.id}`)"
          >{{ music.currentAlbum.artist.name }}</span>
          <span class="text-muted"> · {{ music.currentAlbum.releaseYear }}</span>
          <span class="text-muted"> · {{ music.currentAlbumTracks.length }} tracks</span>
        </div>
      </div>
    </div>

    <div class="album-actions">
      <button class="btn btn-primary" @click="player.playQueue(music.currentAlbumTracks)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Play all
      </button>
    </div>

    <div v-if="music.currentAlbumTracks.length === 0" class="text-muted" style="margin-top: 24px">
      No tracks in this album yet.
    </div>

    <div v-else class="track-list">
      <TrackRow
        v-for="(track, i) in music.currentAlbumTracks"
        :key="track.id"
        :track="track"
        :queue="music.currentAlbumTracks"
        :index="i"
        :show-add-to-playlist="true"
      />
    </div>
  </div>
  <div v-else class="text-muted">Loading…</div>
</template>

<style scoped>
.album-header {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;
}

.album-cover-lg {
  width: 160px;
  height: 160px;
  background: var(--bg-elevated);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  flex-shrink: 0;
}

.album-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.album-meta {
  font-size: 14px;
  margin-top: 8px;
}

.album-artist-link {
  font-weight: 600;
  cursor: pointer;
}

.album-artist-link:hover { text-decoration: underline; }

.album-actions {
  margin-bottom: 24px;
}

.track-list {
  margin-top: 8px;
}
</style>
