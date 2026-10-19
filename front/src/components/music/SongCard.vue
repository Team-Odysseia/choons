<script setup lang="ts">
import { computed } from 'vue'
import type { TrackResponse } from '@/api/types'
import { albumImageUrl } from '@/api/albums'
import { CoverArt } from '@/components/vfd'
import { formatDuration } from '@/lib/format'

const props = defineProps<{ track: TrackResponse }>()
defineEmits<{ play: [track: TrackResponse] }>()

const cover = computed(() => (props.track.album.coverUrl ? albumImageUrl(props.track.album.id) : null))
</script>

<template>
  <button
    type="button"
    class="flex w-full min-w-0 items-center gap-3 rounded border border-line bg-panel p-2.5 text-left transition-colors hover:border-cyan-dim hover:bg-panel-2"
    @click="$emit('play', track)"
  >
    <CoverArt :src="cover" :alt="track.album.title" :size="48" />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-sm text-fg">{{ track.title }}</span>
      <span class="truncate text-xs text-soft">{{ track.artist.name }} · {{ track.album.title }}</span>
    </span>
    <span class="font-display text-sm font-bold text-soft">{{ formatDuration(track.durationSeconds) }}</span>
  </button>
</template>
