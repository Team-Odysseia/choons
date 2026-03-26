<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Volume2 } from 'lucide-vue-next'

const player = usePlayerStore()

const progressPercent = computed(() =>
  player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0,
)
const volumePercent = computed(() => Math.round(player.volume * 100))

const showVolumeLabel = ref(false)

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
      <div class="flex items-center gap-2">
        <!-- Shuffle -->
        <button
          class="size-8 flex items-center justify-center transition-colors"
          :class="player.isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
          title="Shuffle"
          @click="player.toggleShuffle()"
        >
          <Shuffle :size="18" />
        </button>

        <button
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasPrev"
          @click="player.playPrev()"
        >
          <SkipBack :size="20" />
        </button>
        <button
          class="size-[34px] rounded-full bg-foreground text-black flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.currentTrack"
          @click="player.togglePlay()"
        >
          <Play v-if="!player.isPlaying" :size="20" />
          <Pause v-else :size="20" />
        </button>
        <button
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasNext"
          @click="player.playNext()"
        >
          <SkipForward :size="20" />
        </button>

        <!-- Loop -->
        <button
          class="size-8 flex items-center justify-center transition-colors relative"
          :class="player.loopMode !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
          :title="player.loopMode === 'none' ? 'Loop off' : player.loopMode === 'queue' ? 'Loop queue' : 'Loop track'"
          @click="player.cycleLoop()"
        >
          <Repeat1 v-if="player.loopMode === 'track'" :size="18" />
          <Repeat v-else :size="18" />
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
    <div
      class="flex items-center gap-2 justify-end"
      @mouseenter="showVolumeLabel = true"
      @mouseleave="showVolumeLabel = false"
    >
      <Volume2 :size="16" class="text-dimmed shrink-0" />
      <input
        type="range"
        class="w-[90px] range-input"
        min="0"
        max="1"
        step="0.01"
        :value="player.volume"
        @input="onVolume"
      />
      <span
        class="text-[11px] text-dimmed min-w-[30px] transition-opacity"
        :class="showVolumeLabel ? 'opacity-100' : 'opacity-0'"
      >{{ volumePercent }}%</span>
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
