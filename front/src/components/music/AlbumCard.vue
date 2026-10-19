<script setup lang="ts">
import { computed } from 'vue'
import { Play } from 'lucide-vue-next'
import type { AlbumResponse } from '@/api/types'
import { albumImageUrl } from '@/api/albums'
import { CoverArt, IconKey, VfdBadge } from '@/components/vfd'

const props = defineProps<{ album: AlbumResponse; meta?: string; isNew?: boolean; playable?: boolean }>()
const emit = defineEmits<{ play: [album: AlbumResponse] }>()

const cover = computed(() => (props.album.coverUrl ? albumImageUrl(props.album.id) : null))
const subtitle = computed(() => props.meta ?? props.album.artist.name)
</script>

<template>
  <RouterLink
    :to="{ name: 'album', params: { id: album.id } }"
    class="album-card group flex w-[184px] shrink-0 flex-col gap-2.5 focus-visible:outline-none"
  >
    <div class="relative size-[184px]">
      <span aria-hidden="true" class="album-card__disc" />
      <CoverArt
        :src="cover"
        :alt="album.title"
        class="absolute inset-0 shadow-[0_8px_18px_#000000cc] transition-[border-color,box-shadow] group-hover:border-cyan-dim group-hover:shadow-[0_8px_18px_#000000cc,0_0_18px_#5CF6E833] group-focus-visible:border-cyan"
      />
      <VfdBadge v-if="isNew" tone="amber" label="New" class="absolute left-2 top-2" />
      <IconKey
        v-if="playable"
        :icon="Play"
        label="Play album"
        lit
        round
        :size="48"
        class="absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        @click.prevent.stop="emit('play', album)"
      />
    </div>
    <span class="truncate text-[15px] text-fg transition-colors group-hover:text-cyan group-hover:glow-sm">{{ album.title }}</span>
    <span class="-mt-1 truncate text-[13px] text-soft">{{ subtitle }}</span>
  </RouterLink>
</template>

<style scoped>
.album-card__disc {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 172px;
  height: 172px;
  border-radius: 9999px;
  background: conic-gradient(#c9d3d9, #5cf6e8 15%, #e9eef2 30%, #ff4fd8 48%, #b8c2c9 62%, #ffb23f 80%, #c9d3d9);
  -webkit-mask: radial-gradient(circle, transparent 12px, #000 13px);
  mask: radial-gradient(circle, transparent 12px, #000 13px);
  opacity: 0.92;
  box-shadow: 0 4px 10px #000000aa;
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.album-card:hover .album-card__disc,
.album-card:focus-visible .album-card__disc {
  transform: translateX(56px);
  animation: album-disc-spin 8s linear infinite;
}

@keyframes album-disc-spin {
  from {
    transform: translateX(56px) rotate(0deg);
  }
  to {
    transform: translateX(56px) rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .album-card__disc {
    transition: none;
  }
  .album-card:hover .album-card__disc,
  .album-card:focus-visible .album-card__disc {
    animation: none;
  }
}
</style>
