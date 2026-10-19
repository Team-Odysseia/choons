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
import { IconKey, Spectrum, VfdBadge } from '@/components/vfd'
import { formatDuration } from '@/lib/format'

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

const isActive = computed(() => player.currentTrack?.id === props.track.id)
const isFavorited = computed(() => favorites.isFavorited(props.track.id))
const number = computed(() => String((props.index ?? 0) + 1).padStart(2, '0'))
</script>

<template>
  <div
    :class="[
      'group grid items-center gap-3 rounded px-3 py-2.5 transition-colors md:gap-4 md:px-4',
      '[grid-template-columns:28px_minmax(0,1fr)_56px] md:[grid-template-columns:28px_minmax(0,1fr)_minmax(0,240px)_150px_56px]',
      isActive ? 'border-l-2 border-cyan-dim bg-cyan-wash' : 'border-l-2 border-transparent hover:bg-panel-2',
    ]"
  >
    <div class="flex h-[18px] items-center">
      <div v-if="isActive" class="h-4 w-5">
        <Spectrum mini :active="player.isPlaying" :bars="4" :segments="5" :seed="5" />
      </div>
      <span v-else data-testid="track-index" class="font-display text-[15px] font-extrabold text-faint">{{ number }}</span>
    </div>

    <div class="flex min-w-0 cursor-pointer flex-col gap-0.5" @click.stop="play">
      <div class="flex min-w-0 items-center gap-2.5">
        <span
          data-testid="track-title"
          :data-active="isActive ? '' : undefined"
          :class="['truncate text-[15px]', isActive ? 'text-cyan glow-sm' : 'text-fg']"
        >{{ track.title }}</span>
        <VfdBadge v-if="track.hifi" tone="amber" label="HI-FI" class="hidden md:inline-flex" />
      </div>
      <span class="truncate text-[13px] text-soft">{{ track.artist.name }}</span>
    </div>

    <span
      class="hidden cursor-pointer truncate text-[13px] text-soft transition-colors hover:text-cyan md:block"
      @click.stop="router.push(`/library/albums/${track.album.id}`)"
    >{{ track.album.title }}</span>

    <div class="hidden items-center justify-end gap-1 md:flex">
      <IconKey
        v-if="!party.inParty"
        bare
        :size="30"
        :icon="Play"
        label="Play"
        class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        @click.stop="play"
      />
      <IconKey
        bare
        :size="30"
        :icon="Heart"
        :lit="isFavorited"
        :filled="isFavorited"
        :label="isFavorited ? 'Remove from favorites' : 'Add to favorites'"
        @click.stop="favorites.toggle(track.id)"
      />
      <IconKey
        v-if="showAddToQueue"
        bare
        :size="30"
        :icon="ListPlus"
        :label="party.inParty ? 'Add to party queue' : 'Add to queue'"
        class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        @click.stop="addToQueue"
      />
      <IconKey
        v-if="showAddToPlaylist"
        bare
        :size="30"
        :icon="Plus"
        label="Add to playlist"
        class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        @click.stop="dialogOpen = true"
      />
    </div>

    <span
      :class="['text-right font-display text-[15px] font-extrabold', isActive ? 'text-cyan glow-sm' : 'text-soft']"
    >{{ formatDuration(track.durationSeconds) }}</span>
  </div>

  <AddToPlaylistDialog :open="dialogOpen" :tracks="[track]" @close="dialogOpen = false" />
</template>
