<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { TrackResponse } from '@/api/types'
import { Play, Plus, ListPlus, Heart } from 'lucide-vue-next'
import AddToPlaylistDialog from './AddToPlaylistDialog.vue'
import { useFavoritesStore } from '@/stores/favorites'

const props = defineProps<{
  track: TrackResponse
  queue?: TrackResponse[]
  index?: number
  showAddToPlaylist?: boolean
  showAddToQueue?: boolean
}>()

const player = usePlayerStore()
const party = usePartyStore()
const favorites = useFavoritesStore()
const router = useRouter()
const dialogOpen = ref(false)

function play() {
  if (party.inParty) return
  player.playTrack(props.track, props.queue ?? [props.track], props.index ?? 0)
}

function addToQueue() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can add tracks to party queue')
      return
    }
    void party.addTrack(props.track.id)
    return
  }
  player.addToQueue(props.track)
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const isActive = computed(() => player.currentTrack?.id === props.track.id)
</script>

<template>
  <div
    class="grid [grid-template-columns:32px_minmax(0,1fr)_60px] md:[grid-template-columns:32px_minmax(0,1fr)_40px_minmax(0,1fr)_60px_80px] items-center gap-2 md:gap-3 px-3 py-2 rounded transition-colors hover:bg-muted group"
  >
    <span class="text-[13px] text-dimmed text-right">{{ (index ?? 0) + 1 }}</span>

    <div
      class="flex flex-col gap-0.5 min-w-0 cursor-pointer"
      @click.stop="play"
    >
      <span class="text-sm font-medium truncate" :class="isActive ? 'text-primary' : 'text-foreground'">{{ track.title }}</span>
      <span class="text-xs text-muted-foreground truncate">{{ track.artist.name }}</span>
    </div>

    <div class="hidden md:flex items-center">
      <span v-if="track.hifi" class="text-[9px] font-bold tracking-widest px-1 py-px rounded border border-primary/50 text-primary/80 leading-none">HI-FI</span>
    </div>

    <span
      class="hidden md:block text-[13px] text-muted-foreground truncate cursor-pointer hover:underline hover:text-foreground transition-colors"
      @click.stop="router.push(`/library/albums/${track.album.id}`)"
    >{{ track.album.title }}</span>

    <span class="text-[13px] text-dimmed text-right">{{ formatDuration(track.durationSeconds) }}</span>

    <div class="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        v-if="!party.inParty"
        class="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        title="Play"
        @click.stop="play"
      >
        <Play :size="16" />
      </button>

      <button
        class="size-8 rounded-full flex items-center justify-center transition-colors"
        :class="favorites.isFavorited(track.id) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        :title="favorites.isFavorited(track.id) ? 'Remove from favorites' : 'Add to favorites'"
        @click.stop="favorites.toggle(track.id)"
      >
        <Heart :size="16" :fill="favorites.isFavorited(track.id) ? 'currentColor' : 'none'" />
      </button>

      <button
        v-if="showAddToQueue"
        class="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        :title="party.inParty ? 'Add to party queue' : 'Add to queue'"
        @click.stop="addToQueue"
      >
        <ListPlus :size="16" />
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
