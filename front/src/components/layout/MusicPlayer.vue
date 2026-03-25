<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()

const progressPercent = computed(() =>
  player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0,
)

function formatTime(secs: number) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onSeek(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  player.seek((val / 100) * player.duration)
}

function onVolume(e: Event) {
  player.setVolume(parseFloat((e.target as HTMLInputElement).value))
}
</script>

<template>
  <footer class="player">
    <div class="player-track">
      <div v-if="player.currentTrack" class="track-info">
        <span class="track-title">{{ player.currentTrack.title }}</span>
        <span class="track-artist">{{ player.currentTrack.artist.name }}</span>
      </div>
      <div v-else class="track-info">
        <span class="track-title" style="color: var(--text-muted)">No track selected</span>
      </div>
    </div>

    <div class="player-controls">
      <div class="controls-row">
        <button class="btn-icon" @click="player.playPrev()" :disabled="!player.hasPrev">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button class="play-btn" @click="player.togglePlay()" :disabled="!player.currentTrack">
          <svg v-if="!player.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <button class="btn-icon" @click="player.playNext()" :disabled="!player.hasNext">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>
        </button>
      </div>
      <div class="progress-row">
        <span class="time">{{ formatTime(player.currentTime) }}</span>
        <input type="range" class="progress-bar" min="0" max="100" :value="progressPercent" @input="onSeek" />
        <span class="time">{{ formatTime(player.duration) }}</span>
      </div>
    </div>

    <div class="player-volume">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
      <input type="range" class="volume-bar" min="0" max="1" step="0.01" :value="player.volume" @input="onVolume" />
    </div>
  </footer>
</template>

<style scoped>
.player {
  grid-column: 1 / 3;
  grid-row: 2;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 24px;
  gap: 16px;
}

.player-track .track-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.track-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 11px;
  color: var(--text-secondary);
}

.player-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--text-primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s;
}

.play-btn:hover { transform: scale(1.06); }
.play-btn:disabled, button:disabled { opacity: 0.4; cursor: not-allowed; }

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 340px;
}

.time {
  font-size: 11px;
  color: var(--text-muted);
  min-width: 32px;
  text-align: center;
}

.progress-bar, .volume-bar {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  outline: none;
  cursor: pointer;
}

.progress-bar { flex: 1; }
.volume-bar { width: 90px; }

.progress-bar::-webkit-slider-thumb,
.volume-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-primary);
  cursor: pointer;
}

.player-volume {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
</style>
