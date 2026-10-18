<script setup lang="ts">
import { onMounted } from 'vue'
import { useFavoritesStore } from '@/stores/favorites'
import TrackRow from '@/components/music/TrackRow.vue'

const favorites = useFavoritesStore()

onMounted(() => {
  void favorites.fetchFavorites()
})
</script>

<template>
  <div class="page-shell--wide">
    <h1 class="text-xl font-bold text-foreground mb-4">Favorites</h1>

    <div v-if="favorites.loading && favorites.tracks.length === 0" class="text-muted-foreground text-sm py-8 text-center">
      Loading...
    </div>

    <div v-else-if="favorites.tracks.length === 0" class="text-muted-foreground text-sm py-8 text-center">
      No favorites yet. Heart a song to add it here.
    </div>

    <div v-else class="flex flex-col gap-0.5">
      <TrackRow
        v-for="(track, i) in favorites.tracks"
        :key="track.id"
        :track="track"
        :index="i"
        :queue="favorites.tracks"
        :show-add-to-queue="true"
        :show-add-to-playlist="true"
      />
    </div>
  </div>
</template>