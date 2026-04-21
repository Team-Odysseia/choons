<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import { usePlayerStore } from '@/stores/player'
import { useDrawerStore } from '@/stores/drawer'
import { usePartyStore } from '@/stores/party'
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Volume2, ListMusic, Mic2, Menu, Users2 } from 'lucide-vue-next'

const player = usePlayerStore()
const drawer = useDrawerStore()
const party = usePartyStore()

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
  const nextPos = (val / 100) * player.duration
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.seek(nextPos)
    return
  }
  player.seek(nextPos)
}

function onVolume(e: Event) {
  player.setVolume(parseFloat((e.target as HTMLInputElement).value))
}

function openPanel(panel: 'queue' | 'lyrics' | 'party') {
  drawer.toggle(panel)
}

function onPrev() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.prev()
    return
  }
  player.playPrev()
}

function onNext() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    void party.next()
    return
  }
  player.playNext()
}

function onTogglePlay() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can control playback in this party')
      return
    }
    if (!party.state?.playback.track) return
    if (player.isPlaying) {
      void party.pause(player.currentTime)
    } else {
      void party.play(party.state.playback.track.id, player.currentTime)
    }
    return
  }
  player.togglePlay()
}
</script>

<template>
  <footer
    class="col-[1/2] md:col-[1/3] row-start-2 bg-popover border-t border-border px-3 md:px-6 pt-2 md:pt-0"
    style="padding-bottom: var(--safe-area-bottom); min-height: var(--player-h)"
  >
    <div class="md:hidden flex flex-col gap-1.5 pb-2">
      <div class="flex items-center gap-2 min-w-0">
        <button
          data-testid="menu-btn"
          class="shrink-0 size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          @click="drawer.toggleSidebar()"
        >
          <Menu :size="20" />
        </button>
        <div class="min-w-0 flex-1">
          <div v-if="player.currentTrack" class="flex flex-col leading-tight">
            <span class="text-[12px] font-semibold truncate">{{ player.currentTrack.title }}</span>
            <span class="text-[11px] text-muted-foreground truncate">{{ player.currentTrack.artist.name }}</span>
          </div>
          <div v-else>
            <span class="text-[12px] text-dimmed truncate block">No track selected</span>
          </div>
        </div>
        <button
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'queue' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Queue"
          @click="openPanel('queue')"
        >
          <ListMusic :size="16" />
        </button>
        <button
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'lyrics' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Lyrics"
          @click="openPanel('lyrics')"
        >
          <Mic2 :size="16" />
        </button>
        <button
          v-if="party.inParty"
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'party' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Party"
          @click="openPanel('party')"
        >
          <Users2 :size="16" />
        </button>
      </div>

      <div class="flex items-center justify-center gap-1">
        <button
          data-testid="shuffle-btn"
          class="size-8 flex items-center justify-center transition-colors"
          :class="player.isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
          title="Shuffle"
          @click="player.toggleShuffle()"
        >
          <Shuffle :size="18" />
        </button>

        <button
          data-testid="prev-btn"
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasPrev || (party.inParty && !party.canControl)"
          @click="onPrev"
        >
          <SkipBack :size="20" />
        </button>
        <button
          data-testid="play-btn"
          class="size-[34px] rounded-full bg-foreground text-black flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.currentTrack || (party.inParty && !party.canControl)"
          @click="onTogglePlay"
        >
          <Play v-if="!player.isPlaying" :size="20" />
          <Pause v-else :size="20" />
        </button>
        <button
          data-testid="next-btn"
          class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!player.hasNext || (party.inParty && !party.canControl)"
          @click="onNext"
        >
          <SkipForward :size="20" />
        </button>

        <button
          data-testid="loop-btn"
          class="size-8 flex items-center justify-center transition-colors"
          :class="player.loopMode !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
          :title="player.loopMode === 'none' ? 'Loop off' : player.loopMode === 'queue' ? 'Loop queue' : 'Loop track'"
          @click="player.cycleLoop()"
        >
          <Repeat1 v-if="player.loopMode === 'track'" :size="18" />
          <Repeat v-else :size="18" />
        </button>
      </div>

      <div class="flex items-center gap-2 w-full">
        <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.currentTime) }}</span>
        <input
          data-testid="progress-range"
          type="range"
          aria-label="Progress"
          class="flex-1 range-input"
          min="0"
          max="100"
          :disabled="party.inParty && !party.canControl"
          :value="progressPercent"
          @input="onSeek"
        />
        <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.duration) }}</span>
      </div>
    </div>

    <div class="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-4 h-full">
      <div class="min-w-0 flex items-center gap-2">
        <div class="min-w-0">
          <div v-if="player.currentTrack" class="flex flex-col gap-0.5">
            <span class="text-[13px] font-semibold truncate">{{ player.currentTrack.title }}</span>
            <span class="text-[11px] text-muted-foreground truncate">{{ player.currentTrack.artist.name }}</span>
          </div>
          <div v-else>
            <span class="text-[13px] text-dimmed">No track selected</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center gap-1.5">
        <div class="flex items-center gap-1 md:gap-2">
          <button
            data-testid="shuffle-btn"
            class="size-8 flex items-center justify-center transition-colors"
            :class="player.isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
            title="Shuffle"
            @click="player.toggleShuffle()"
          >
            <Shuffle :size="18" />
          </button>

          <button
            data-testid="prev-btn"
            class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!player.hasPrev || (party.inParty && !party.canControl)"
            @click="onPrev"
          >
            <SkipBack :size="20" />
          </button>
          <button
            data-testid="play-btn"
            class="size-[34px] rounded-full bg-foreground text-black flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!player.currentTrack || (party.inParty && !party.canControl)"
            @click="onTogglePlay"
          >
            <Play v-if="!player.isPlaying" :size="20" />
            <Pause v-else :size="20" />
          </button>
          <button
            data-testid="next-btn"
            class="size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!player.hasNext || (party.inParty && !party.canControl)"
            @click="onNext"
          >
            <SkipForward :size="20" />
          </button>

          <button
            data-testid="loop-btn"
            class="size-8 flex items-center justify-center transition-colors relative"
            :class="player.loopMode !== 'none' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
            :title="player.loopMode === 'none' ? 'Loop off' : player.loopMode === 'queue' ? 'Loop queue' : 'Loop track'"
            @click="player.cycleLoop()"
          >
            <Repeat1 v-if="player.loopMode === 'track'" :size="18" />
            <Repeat v-else :size="18" />
          </button>
        </div>

        <div class="flex items-center gap-2 w-full max-w-[340px]">
          <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.currentTime) }}</span>
        <input
          data-testid="progress-range"
          type="range"
          aria-label="Progress"
          class="flex-1 range-input"
          min="0"
          max="100"
          :disabled="party.inParty && !party.canControl"
          :value="progressPercent"
          @input="onSeek"
        />
        <span class="text-[11px] text-dimmed min-w-[32px] text-center">{{ formatTime(player.duration) }}</span>
      </div>
    </div>

      <div
        class="flex items-center gap-2 justify-end"
        @mouseenter="showVolumeLabel = true"
        @mouseleave="showVolumeLabel = false"
      >
        <button
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'queue' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Queue"
          @click="openPanel('queue')"
        >
          <ListMusic :size="16" />
        </button>
        <button
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'lyrics' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Lyrics"
          @click="openPanel('lyrics')"
        >
          <Mic2 :size="16" />
        </button>
        <button
          v-if="party.inParty"
          class="size-7 flex items-center justify-center transition-colors"
          :class="drawer.activePanel === 'party' ? 'text-primary' : 'text-dimmed hover:text-foreground'"
          title="Party"
          @click="openPanel('party')"
        >
          <Users2 :size="16" />
        </button>
        <Volume2 :size="16" class="text-dimmed shrink-0" />
        <input
          data-testid="volume-range"
          type="range"
          aria-label="Volume"
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
