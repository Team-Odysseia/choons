<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'

const route = useRoute()
const router = useRouter()
const music = useMusicStore()

onMounted(() => music.fetchArtist(route.params.id as string))
</script>

<template>
  <div v-if="!music.loading && music.currentArtist">
    <div class="flex items-center gap-6 mb-8">
      <div
        class="size-[120px] rounded-full bg-muted flex items-center justify-center text-[56px] font-extrabold text-muted-foreground shrink-0"
      >
        {{ music.currentArtist.name[0]?.toUpperCase() }}
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Artist</div>
        <h1 class="text-[28px] font-extrabold mb-2">{{ music.currentArtist.name }}</h1>
        <p v-if="music.currentArtist.bio" class="text-[13px] text-muted-foreground max-w-[500px] mt-2">
          {{ music.currentArtist.bio }}
        </p>
      </div>
    </div>

    <h2 class="text-lg font-bold mb-4">Albums</h2>

    <div v-if="music.albums.length === 0" class="text-[13px] text-dimmed">No albums yet.</div>
    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      <div
        v-for="album in music.albums"
        :key="album.id"
        class="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted"
        @click="router.push(`/library/albums/${album.id}`)"
      >
        <div
          class="w-full aspect-square bg-muted rounded flex items-center justify-center text-[40px] mb-3"
        >
          ♪
        </div>
        <div class="font-bold text-sm mb-1 truncate">{{ album.title }}</div>
        <div class="text-xs text-muted-foreground truncate">{{ album.releaseYear }}</div>
      </div>
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>
