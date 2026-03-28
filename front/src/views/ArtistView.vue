<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useArtistQuery, useAlbumsQuery } from '@/composables/queries'
import { artistImageUrl } from '@/api/artists'
import { albumImageUrl } from '@/api/albums'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const { data: artist, isPending } = useArtistQuery(id)
const { data: albums } = useAlbumsQuery(id)

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
}
</script>

<template>
  <div v-if="!isPending && artist">
    <div class="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-8">
      <img
        v-if="artist.avatarUrl"
        :src="artistImageUrl(artist.id)"
        class="size-[100px] md:size-[120px] rounded-full object-cover shrink-0"
      />
      <div
        v-else
        class="size-[100px] md:size-[120px] rounded-full bg-muted flex items-center justify-center text-[56px] font-extrabold text-muted-foreground shrink-0"
      >
        {{ artist.name[0]?.toUpperCase() }}
      </div>
      <div class="min-w-0">
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Artist</div>
        <h1 class="text-[24px] md:text-[28px] font-extrabold mb-2">{{ artist.name }}</h1>
        <p v-if="artist.bio" class="text-[13px] text-muted-foreground max-w-[500px] mt-2">
          {{ artist.bio }}
        </p>
      </div>
    </div>

    <h2 class="text-lg font-bold mb-4">Albums</h2>

    <div v-if="!albums?.length" class="text-[13px] text-dimmed">No albums yet.</div>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      <div
        v-for="album in albums"
        :key="album.id"
        class="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted"
        @click="router.push(`/library/albums/${album.id}`)"
      >
        <div class="relative mb-3">
          <img
            v-if="album.coverUrl"
            :src="albumImageUrl(album.id)"
            class="w-full aspect-square rounded object-cover"
          />
          <div
            v-else
            class="w-full aspect-square bg-muted rounded flex items-center justify-center text-[40px]"
          >
            ♪
          </div>
          <span
            v-if="isNew(album.createdAt)"
            class="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded"
          >NEW</span>
        </div>
        <div class="font-bold text-sm mb-1 truncate">{{ album.title }}</div>
        <div class="text-xs text-muted-foreground truncate">{{ album.releaseYear }}</div>
      </div>
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>
