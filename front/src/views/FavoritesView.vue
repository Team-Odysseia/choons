<script setup lang="ts">
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { useFavoritesStore } from '@/stores/favorites'
import { apiErrorMessage } from '@/lib/errors'
import TrackRow from '@/components/music/TrackRow.vue'
import TrackListHeader from '@/components/music/TrackListHeader.vue'
import { PageHeader, Readout, StatePlate } from '@/components/vfd'

const favorites = useFavoritesStore()

onMounted(async () => {
  try {
    await favorites.fetchFavorites()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load favorites'))
  }
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-end gap-6">
      <PageHeader kicker="Source · Favorites" title="Favorites" class="flex-1" />
      <Readout
        v-if="favorites.tracks.length"
        data-testid="hearted-readout"
        caption="Hearted"
        :value="String(favorites.tracks.length).padStart(3, '0')"
        align="end"
      />
    </div>

    <StatePlate
      v-if="favorites.loading && favorites.tracks.length === 0"
      kind="loading"
      code="READING…"
      message="Loading..."
    />
    <StatePlate
      v-else-if="favorites.tracks.length === 0"
      code="NO DISC"
      message="No favorites yet. Heart a song to add it here."
    />

    <section v-else class="flex flex-col gap-1">
      <TrackListHeader />
      <TrackRow
        v-for="(track, i) in favorites.tracks"
        :key="track.id"
        :track="track"
        :index="i"
        :queue="favorites.tracks"
        :show-add-to-queue="true"
        :show-add-to-playlist="true"
      />
    </section>
  </div>
</template>
