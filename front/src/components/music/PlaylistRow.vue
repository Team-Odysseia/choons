<script setup lang="ts">
import { ListMusic, Trash2 } from 'lucide-vue-next'
import type { PlaylistSummaryResponse } from '@/api/types'
import { IconKey, VfdBadge } from '@/components/vfd'

defineProps<{ playlist: PlaylistSummaryResponse; deletable: boolean }>()
defineEmits<{ delete: [playlist: PlaylistSummaryResponse] }>()
</script>

<template>
  <div class="group flex items-center gap-4 rounded border border-line bg-panel py-2.5 pl-2.5 pr-4 transition-colors hover:border-cyan-dim/60">
    <RouterLink :to="{ name: 'playlist', params: { id: playlist.id } }" class="flex min-w-0 flex-1 items-center gap-4">
      <span class="vfd-well flex size-[52px] shrink-0 items-center justify-center rounded-[3px]">
        <ListMusic :size="22" class="text-cyan drop-shadow-[0_0_8px_#5CF6E899]" aria-hidden="true" />
      </span>
      <span class="flex min-w-0 flex-col gap-0.5">
        <span class="truncate text-[15px] text-fg group-hover:text-cyan">{{ playlist.name }}</span>
        <span class="text-[13px] text-soft">{{ playlist.trackCount }} tracks</span>
      </span>
    </RouterLink>
    <VfdBadge :tone="playlist.isPublic ? 'cyan' : 'mute'" :label="playlist.isPublic ? 'Public' : 'Private'" />
    <IconKey
      v-if="deletable"
      :icon="Trash2"
      label="Delete playlist"
      :size="32"
      class="text-red! opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      @click="$emit('delete', playlist)"
    />
  </div>
</template>
