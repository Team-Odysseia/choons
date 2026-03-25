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

function openMenu() {
  showMenu.value = true
  setTimeout(() => {
    document.addEventListener('click', closeMenu, { once: true })
  }, 0)
}

function closeMenu() {
  showMenu.value = false
}

async function addToPlaylist(playlistId: string) {
  await playlists.addTrack(playlistId, props.track.id)
  showMenu.value = false
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <div v-if="showAddToPlaylist" class="relative">
        <button
          class="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Add to playlist"
          @click.stop="openMenu"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>

        <div
          v-if="showMenu"
          class="absolute right-0 bottom-full bg-muted border border-border rounded min-w-[160px] z-50 overflow-hidden"
        >
          <template v-if="playlists.playlists.length">
            <button
              v-for="pl in playlists.playlists"
              :key="pl.id"
              class="block w-full px-3.5 py-2.5 text-left text-[13px] hover:bg-card transition-colors"
              @click="addToPlaylist(pl.id)"
            >
              {{ pl.name }}
            </button>
          </template>
          <span v-else class="block px-3.5 py-2.5 text-[13px] text-dimmed">No playlists yet</span>
        </div>
      </div>
    </div>
  </div>
</template>
