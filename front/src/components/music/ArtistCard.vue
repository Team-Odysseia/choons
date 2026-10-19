<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ArtistResponse } from '@/api/types'
import { artistImageUrl } from '@/api/artists'

const props = defineProps<{ artist: ArtistResponse }>()
const avatar = computed(() => (props.artist.avatarUrl ? artistImageUrl(props.artist.id) : null))
const initial = computed(() => props.artist.name.charAt(0).toUpperCase())
const failed = ref(false)
</script>

<template>
  <RouterLink
    :to="`/library/artists/${artist.id}`"
    class="group flex w-[150px] shrink-0 flex-col items-center gap-3"
  >
    <div
      class="size-[136px] rounded-full bg-[linear-gradient(to_top,#0D1114,#DCE3E8)] p-1 shadow-[0_6px_14px_#000000cc] transition-shadow group-hover:shadow-[0_6px_14px_#000000cc,0_0_20px_#5CF6E840]"
    >
      <img
        v-if="avatar && !failed"
        :src="avatar"
        :alt="artist.name"
        loading="lazy"
        class="size-full rounded-full object-cover"
        @error="failed = true"
      />
      <div
        v-else
        data-placeholder
        class="flex size-full items-center justify-center rounded-full bg-[linear-gradient(200deg,#123B3A,#0A1114)] font-display text-4xl font-extrabold text-cyan glow-sm"
        aria-hidden="true"
      >{{ initial }}</div>
    </div>
    <span class="w-full truncate text-center text-[15px] text-fg transition-colors group-hover:text-cyan">{{ artist.name }}</span>
  </RouterLink>
</template>
