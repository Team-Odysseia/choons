<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import type { TrackResponse } from '@/api/types'

const props = defineProps<{
  track: TrackResponse
  queue?: TrackResponse[]
  index?: number
  showAddToPlaylist?: boolean
}>()

const player = usePlayerStore()
const playlists = usePlaylistsStore()
const showMenu = ref(false)

function play() {
  player.playTrack(props.track, props.queue ?? [props.track], props.index ?? 0)
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function addToPlaylist(playlistId: string) {
  await playlists.addTrack(playlistId, props.track.id)
  showMenu.value = false
}

const isActive = () => player.currentTrack?.id === props.track.id
</script>

<template>
  <div class="track-row" :class="{ active: isActive() }" @dblclick="play">
    <span class="track-num">{{ (index ?? 0) + 1 }}</span>
    <div class="track-meta">
      <span class="track-name">{{ track.title }}</span>
      <span class="track-artist-name">{{ track.artist.name }}</span>
    </div>
    <span class="track-album">{{ track.album.title }}</span>
    <span class="track-duration">{{ formatDuration(track.durationSeconds) }}</span>
    <div class="track-actions">
      <button class="btn-icon play-icon" @click.stop="play" title="Play">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div v-if="showAddToPlaylist" class="menu-wrap">
        <button class="btn-icon" @click.stop="showMenu = !showMenu" title="Add to playlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        <div v-if="showMenu && playlists.playlists.length" class="dropdown" v-click-outside="() => showMenu = false">
          <button
            v-for="pl in playlists.playlists"
            :key="pl.id"
            class="dropdown-item"
            @click="addToPlaylist(pl.id)"
          >
            {{ pl.name }}
          </button>
        </div>
        <div v-else-if="showMenu" class="dropdown">
          <span class="dropdown-item" style="color: var(--text-muted)">No playlists yet</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr 60px 80px;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: background 0.1s;
  cursor: pointer;
}

.track-row:hover { background: var(--bg-elevated); }
.track-row.active .track-name { color: var(--accent); }

.track-num {
  font-size: 13px;
  color: var(--text-muted);
  text-align: right;
}

.track-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.track-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist-name {
  font-size: 12px;
  color: var(--text-secondary);
}

.track-album {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-duration {
  font-size: 13px;
  color: var(--text-muted);
  text-align: right;
}

.track-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.1s;
}

.track-row:hover .track-actions { opacity: 1; }

.menu-wrap { position: relative; }

.dropdown {
  position: absolute;
  right: 0;
  bottom: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  min-width: 160px;
  z-index: 100;
  overflow: hidden;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover { background: var(--bg-card); }
</style>
