<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAlbumQuery, useAlbumTracksQuery } from '@/composables/queries'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import { usePlaylistsStore } from '@/stores/playlists'
import { useFavoritesStore } from '@/stores/favorites'
import TrackRow from '@/components/music/TrackRow.vue'
import AddToPlaylistDialog from '@/components/music/AddToPlaylistDialog.vue'
import { Button } from '@/components/ui/button'
import { Play, Shuffle, ListPlus, Plus } from 'lucide-vue-next'
import { albumImageUrl } from '@/api/albums'
import TrackListHeader from '@/components/music/TrackListHeader.vue'
import { CoverArt, StatePlate } from '@/components/vfd'
import { totalMinutes } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/motion'

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const party = usePartyStore()
const playlists = usePlaylistsStore()
const favorites = useFavoritesStore()

const id = computed(() => route.params.id as string)
const { data: album, isPending, isError } = useAlbumQuery(id)
const { data: tracks } = useAlbumTracksQuery(id)

const albumDialogOpen = ref(false)
const focusedTrackId = ref<string | null>(null)
let focusTimer: ReturnType<typeof setTimeout> | null = null

const trackList = computed(() => tracks.value ?? [])
const cover = computed(() => (album.value?.coverUrl ? albumImageUrl(album.value.id) : null))
const minutes = computed(() => totalMinutes(trackList.value))

function addAllToQueue() {
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can add tracks to party queue')
      return
    }
    void party.addTracks(trackList.value)
    return
  }
  player.addTracksToQueue(trackList.value)
}

function clearFocusTimer() {
  if (!focusTimer) return
  clearTimeout(focusTimer)
  focusTimer = null
}

async function focusTrackFromRoute() {
  const trackId = typeof route.query.track === 'string' ? route.query.track : null
  if (!trackId || !trackList.value.some((track) => track.id === trackId)) return

  await nextTick()
  const target = document.getElementById(`track-${trackId}`)
  if (!target) return

  target.scrollIntoView({ behavior: prefersReducedMotion.value ? 'auto' : 'smooth', block: 'center' })
  focusedTrackId.value = trackId
  clearFocusTimer()
  focusTimer = setTimeout(() => {
    if (focusedTrackId.value === trackId) focusedTrackId.value = null
  }, 1300)
}

watch([trackList, () => route.query.track], () => {
  void focusTrackFromRoute()
  if (trackList.value.length) void favorites.fetchStatus(trackList.value.map((t) => t.id))
}, { immediate: true })

onBeforeUnmount(() => {
  clearFocusTimer()
})
</script>

<template>
  <div v-if="!isPending && album" class="flex flex-col gap-8">
    <section class="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
      <div class="relative h-[180px] w-[250px] shrink-0 md:h-[240px] md:w-[330px]">
        <span aria-hidden="true" class="album-disc" />
        <CoverArt
          :src="cover"
          :alt="album.title + ' cover'"
          class="absolute left-0 top-0 size-[180px] shadow-[0_12px_28px_#000] md:size-[240px]"
        />
      </div>
      <div class="flex min-w-0 flex-col gap-2.5">
        <span class="font-label text-[10px] uppercase tracking-[0.3em] text-amber glow-amber">Album</span>
        <h1 class="break-words font-display text-[40px] font-extrabold uppercase leading-none text-cyan glow-lg md:text-[60px]">{{ album.title }}</h1>
        <div class="flex flex-wrap items-center gap-x-2.5 text-[15px] text-soft">
          <button
            type="button"
            class="text-cyan underline-offset-4 hover:underline"
            @click="router.push(`/library/artists/${album.artist.id}`)"
          >{{ album.artist.name }}</button>
          <span>· {{ album.releaseYear }}</span>
          <span>· {{ trackList.length }} tracks</span>
          <span v-if="trackList.length">· {{ minutes }} min</span>
        </div>
        <div class="flex flex-wrap items-center gap-2.5 pt-2.5">
          <Button v-if="!party.inParty" @click="player.playQueue(trackList)">
            <template #icon><Play :size="14" aria-hidden="true" /></template>
            Play all
          </Button>
          <Button v-if="!party.inParty" variant="outline" @click="player.playQueueShuffled(trackList)">
            <template #icon><Shuffle :size="14" aria-hidden="true" /></template>
            Shuffle
          </Button>
          <Button variant="outline" :disabled="trackList.length === 0" @click="addAllToQueue">
            <template #icon><ListPlus :size="14" aria-hidden="true" /></template>
            {{ party.inParty ? 'Add to party queue' : 'Add to queue' }}
          </Button>
          <Button variant="outline" :disabled="trackList.length === 0" @click="albumDialogOpen = true">
            <template #icon><Plus :size="14" aria-hidden="true" /></template>
            Add to playlist
          </Button>
        </div>
      </div>
    </section>

    <StatePlate v-if="trackList.length === 0" code="NO TRACKS" message="No tracks in this album yet." />
    <section v-else class="flex flex-col gap-1">
      <TrackListHeader />
      <div
        v-for="(track, i) in trackList"
        :id="`track-${track.id}`"
        :key="track.id"
        class="track-anchor"
        :class="focusedTrackId === track.id ? 'track-anchor--focused' : ''"
      >
        <TrackRow
          :track="track"
          :queue="trackList"
          :index="i"
          :show-add-to-queue="true"
          :show-add-to-playlist="true"
        />
      </div>
    </section>
  </div>
  <StatePlate v-else-if="isError" kind="error" code="ERR 404" message="This album is not available." />
  <StatePlate v-else kind="loading" code="READING…" message="Loading…" />

  <AddToPlaylistDialog
    :open="albumDialogOpen"
    :tracks="trackList"
    @close="albumDialogOpen = false"
  />
</template>

<style scoped>
.album-disc {
  position: absolute;
  top: 6px;
  right: 0;
  width: 168px;
  height: 168px;
  border-radius: 9999px;
  background: conic-gradient(#c9d3d9, #5cf6e8 15%, #e9eef2 30%, #ff4fd8 48%, #b8c2c9 62%, #ffb23f 80%, #c9d3d9);
  -webkit-mask: radial-gradient(circle, transparent 14px, #000 15px);
  mask: radial-gradient(circle, transparent 14px, #000 15px);
  box-shadow: 0 6px 14px #000000aa;
}

@media (min-width: 768px) {
  .album-disc {
    width: 228px;
    height: 228px;
  }
}

.track-anchor {
  border-radius: 6px;
}

.track-anchor--focused {
  animation: track-shine 1.1s ease-out;
}

@keyframes track-shine {
  0% {
    box-shadow: 0 0 0 0 transparent;
  }
  35% {
    box-shadow: 0 0 0 1px #5cf6e8, 0 0 18px #5cf6e866;
    background: #5cf6e81a;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
    background: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .track-anchor--focused {
    animation: none;
    box-shadow: 0 0 0 1px #5cf6e8;
  }
}
</style>
