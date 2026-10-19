<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
import type { AlbumRequestResponse, AlbumRequestStatus } from '@/api/types'
import { VfdBadge } from '@/components/vfd'

const props = defineProps<{ request: AlbumRequestResponse; requester?: string }>()

const tones: Record<AlbumRequestStatus, 'amber' | 'cyan' | 'red'> = {
  PENDING: 'amber',
  ACCEPTED: 'cyan',
  REJECTED: 'red',
}

const date = computed(() =>
  new Date(props.request.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-line bg-panel px-4 py-3.5">
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-[15px] text-fg">{{ request.albumName }} · {{ request.artistName }}</span>
      <span class="text-xs text-soft">
        <template v-if="requester">Requested by {{ requester }} · </template>{{ date }}
      </span>
    </div>
    <VfdBadge data-testid="request-status" :tone="tones[request.status]" :label="request.status" />
    <a
      :href="request.externalUrl"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open album link"
      class="inline-flex size-[30px] items-center justify-center text-cyan-dim transition-colors hover:text-cyan"
    >
      <ExternalLink :size="15" aria-hidden="true" />
    </a>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
