<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'
import { albumImageUrl } from '@/api/albums'

const router = useRouter()
const music = useMusicStore()

onMounted(() => music.fetchAllAlbums())

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-extrabold mb-6">All Albums</h1>

    <div v-if="music.loading" class="text-[13px] text-dimmed">Loading…</div>
    <div v-else-if="music.allAlbums.length === 0" class="text-[13px] text-dimmed">
      No albums yet. Ask an admin to add some music.
    </div>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      <div
        v-for="album in music.allAlbums"
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
        <div class="text-xs text-muted-foreground truncate">{{ album.artist.name }}</div>
        <div class="text-xs text-muted-foreground">{{ album.releaseYear }}</div>
      </div>
    </div>
  </div>
</template>
