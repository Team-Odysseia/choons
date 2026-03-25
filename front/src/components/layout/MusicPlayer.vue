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
  <footer
    class="col-[1/3] row-start-2 bg-popover border-t border-border grid [grid-template-columns:1fr_auto_1fr] items-center px-6 gap-4"
  >
    <!-- Track info -->
    <div class="min-w-0">
      <div v-if="player.currentTrack" class="flex flex-col gap-0.5">
        <span class="text-[13px] font-semibold truncate">{{ player.currentTrack.title }}</span>
        <span class="text-[11px] text-muted-foreground">{{ player.currentTrack.artist.name }}</span>
      </div>
      <div v-else>
        <span class="text-[13px] text-dimmed">No track selected</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-col items-center gap-1.5">
      <div class="flex items-center gap-3">
        <button
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasPrev"
          @click="player.playPrev()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
          </svg>
        </button>
        <button
          class="size-[34px] rounded-full bg-foreground text-black flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.currentTrack"
          @click="player.togglePlay()"
        >
          <svg v-if="!player.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        </button>
        <button
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasNext"
          @click="player.playNext()"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z" />
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-2 w-[340px]">
        <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.currentTime) }}</span>
        <input
          type="range"
          class="flex-1 range-input"
          min="0"
          max="100"
          :value="progressPercent"
          @input="onSeek"
        />
        <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.duration) }}</span>
      </div>
    </div>

    <!-- Volume -->
    <div class="flex items-center gap-2 justify-end">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="text-dimmed">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
      </svg>
      <input
        type="range"
        class="w-[90px] range-input"
        min="0"
        max="1"
        step="0.01"
        :value="player.volume"
        @input="onVolume"
      />
    </div>
  </footer>
</template>

<style scoped>
.range-input {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  outline: none;
  cursor: pointer;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--foreground);
  cursor: pointer;
}
</style>
