<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerStore } from '@/stores/player'
import type { TrackResponse } from '@/api/types'
import { Play, Plus } from 'lucide-vue-next'
import AddToPlaylistDialog from './AddToPlaylistDialog.vue'

const props = defineProps<{
  track: TrackResponse
  queue?: TrackResponse[]
  index?: number
  showAddToPlaylist?: boolean
}>()

const player = usePlayerStore()
const dialogOpen = ref(false)

function play() {
  player.playTrack(props.track, props.queue ?? [props.track], props.index ?? 0)
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const isActive = () => player.currentTrack?.id === props.track.id
</script>

<template>
  <div
    class="grid [grid-template-columns:32px_1fr_1fr_60px_80px] items-center gap-3 px-3 py-2 rounded transition-colors cursor-pointer hover:bg-muted group"
    @dblclick="play"
  >
    <span class="text-[13px] text-dimmed text-right">{{ (index ?? 0) + 1 }}</span>

    <div class="flex flex-col gap-0.5 min-w-0">
      <span class="text-sm font-medium truncate" :class="isActive() ? 'text-primary' : 'text-foreground'">{{ track.title }}</span>
      <span class="text-xs text-muted-foreground">{{ track.artist.name }}</span>
    </div>

    <span class="text-[13px] text-muted-foreground truncate">{{ track.album.title }}</span>

    <span class="text-[13px] text-dimmed text-right">{{ formatDuration(track.durationSeconds) }}</span>

    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        class="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title="Play"
        @click.stop="play"
      >
        <Play :size="16" />
      </button>

      <button
        v-if="showAddToPlaylist"
        class="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title="Add to playlist"
        @click.stop="dialogOpen = true"
      >
        <Plus :size="16" />
      </button>
    </div>
  </div>

  <AddToPlaylistDialog
    :open="dialogOpen"
    :tracks="[track]"
    @close="dialogOpen = false"
  />
</template>
