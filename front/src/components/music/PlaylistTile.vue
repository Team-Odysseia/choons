<script setup lang="ts">
import { ListMusic } from 'lucide-vue-next'
import type { PlaylistSummaryResponse } from '@/api/types'

defineProps<{ playlist: PlaylistSummaryResponse; owner?: string }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'playlist', params: { id: playlist.id } }"
    class="group flex w-[184px] shrink-0 flex-col gap-2.5"
  >
    <div
      class="vfd-well vfd-scanlines flex size-[184px] flex-col items-center justify-center gap-1.5 rounded-[3px] transition-shadow group-hover:shadow-[inset_0_3px_10px_#000000ee,0_0_18px_#5CF6E826]"
    >
      <ListMusic :size="40" class="text-cyan drop-shadow-[0_0_10px_#5CF6E899]" aria-hidden="true" />
      <span class="font-display text-lg font-extrabold text-cyan glow-sm" aria-hidden="true">{{ playlist.trackCount }} TRK</span>
    </div>
    <span class="truncate text-[15px] text-fg transition-colors group-hover:text-cyan">{{ playlist.name }}</span>
    <span class="-mt-1 truncate text-[13px] text-soft">
      <template v-if="owner">by {{ owner }} · </template>{{ playlist.trackCount }} tracks
    </span>
  </RouterLink>
</template>
