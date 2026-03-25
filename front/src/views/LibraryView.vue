<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'

const music = useMusicStore()
const router = useRouter()

onMounted(() => music.fetchArtists())
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Library</h1>

    <div v-if="music.loading" class="text-[13px] text-dimmed">Loading…</div>

    <div v-else-if="music.artists.length === 0" class="text-[13px] text-dimmed">
      No artists yet. Ask an admin to add some music.
    </div>

    <div v-else>
      <h2 class="text-lg font-bold mb-4">Artists</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        <div
          v-for="artist in music.artists"
          :key="artist.id"
          class="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <div
            class="w-full aspect-square bg-muted rounded-full flex items-center justify-center text-[40px] font-extrabold text-muted-foreground mb-3"
          >
            {{ artist.name[0]?.toUpperCase() }}
          </div>
          <div class="font-bold text-sm mb-1 truncate">{{ artist.name }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
