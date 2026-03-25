<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import TrackRow from '@/components/music/TrackRow.vue'

const route = useRoute()
const playlists = usePlaylistsStore()
const player = usePlayerStore()

onMounted(() => playlists.fetchPlaylist(route.params.id as string))

async function removeTrack(trackId: string) {
  await playlists.removeTrack(playlists.current!.id, trackId)
}
</script>

<template>
  <div v-if="!playlists.loading && playlists.current">
    <div class="playlist-header">
      <div class="playlist-cover">♫</div>
      <div>
        <div class="label">Playlist</div>
        <h1 class="page-title" style="margin-bottom: 8px">{{ playlists.current.name }}</h1>
        <span class="text-muted">{{ playlists.current.tracks.length }} tracks</span>
      </div>
    </div>

    <div class="album-actions" style="margin-bottom: 24px">
      <button
        class="btn btn-primary"
        :disabled="playlists.current.tracks.length === 0"
        @click="player.playQueue(playlists.current!.tracks)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Play all
      </button>
    </div>

    <div v-if="playlists.current.tracks.length === 0" class="text-muted">
      No tracks yet. Add some from an album.
    </div>

    <div v-else class="track-list">
      <div v-for="(track, i) in playlists.current.tracks" :key="track.id" class="track-list-item">
        <TrackRow
          :track="track"
          :queue="playlists.current.tracks"
          :index="i"
        />
        <button class="btn-icon remove-btn" @click="removeTrack(track.id)" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
  <div v-else class="text-muted">Loading…</div>
</template>

<style scoped>
.playlist-header {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  margin-bottom: 32px;
}

.playlist-cover {
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

.label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.track-list-item {
  display: flex;
  align-items: center;
}

.track-list-item > :first-child {
  flex: 1;
}

.remove-btn {
  opacity: 0;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: opacity 0.1s, color 0.1s;
}

.track-list-item:hover .remove-btn { opacity: 1; }
.remove-btn:hover { color: var(--danger); }
</style>
