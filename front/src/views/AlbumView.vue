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

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const party = usePartyStore()
const playlists = usePlaylistsStore()
const favorites = useFavoritesStore()

const id = computed(() => route.params.id as string)
const { data: album, isPending } = useAlbumQuery(id)
const { data: tracks } = useAlbumTracksQuery(id)

const albumDialogOpen = ref(false)
const focusedTrackId = ref<string | null>(null)
let focusTimer: ReturnType<typeof setTimeout> | null = null

const trackList = computed(() => tracks.value ?? [])

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

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
  <div v-if="!isPending && album">
    <div class="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 mb-8">
      <img
        v-if="album.coverUrl"
        :src="albumImageUrl(album.id)"
        class="size-[120px] md:size-[160px] rounded-lg object-cover shrink-0"
      />
      <div
        v-else
        class="size-[120px] md:size-[160px] bg-muted rounded-lg flex items-center justify-center text-[64px] shrink-0"
      >
        ♪
      </div>
      <div class="min-w-0">
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Album</div>
        <h1 class="text-[24px] md:text-[28px] font-extrabold mb-1">{{ album.title }}</h1>
        <div class="text-sm mt-2">
          <span
            class="font-semibold cursor-pointer hover:underline"
            @click="router.push(`/library/artists/${album.artist.id}`)"
          >{{ album.artist.name }}</span>
          <span class="text-[13px] text-dimmed"> · {{ album.releaseYear }}</span>
          <span class="text-[13px] text-dimmed"> · {{ trackList.length }} tracks</span>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 mb-6">
      <Button v-if="!party.inParty" @click="player.playQueue(trackList)">
        <Play :size="16" />
        Play all
      </Button>
      <Button v-if="!party.inParty" variant="outline" @click="player.playQueueShuffled(trackList)">
        <Shuffle :size="16" />
        Shuffle
      </Button>
      <Button
        variant="outline"
        :disabled="trackList.length === 0 || (party.inParty && !party.canControl)"
        @click="addAllToQueue"
      >
        <ListPlus :size="16" />
        {{ party.inParty ? 'Add to party queue' : 'Add to queue' }}
      </Button>
      <Button
        variant="outline"
        :disabled="trackList.length === 0"
        @click="albumDialogOpen = true"
      >
        <Plus :size="16" />
        Add to playlist
      </Button>
    </div>

    <div v-if="trackList.length === 0" class="text-[13px] text-dimmed mt-6">
      No tracks in this album yet.
    </div>
    <div v-else class="mt-2">
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
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>

  <AddToPlaylistDialog
    :open="albumDialogOpen"
    :tracks="trackList"
    @close="albumDialogOpen = false"
  />
</template>

<style scoped>
.track-anchor {
  border-radius: 10px;
}

.track-anchor--focused {
  animation: track-shine 1.1s ease-out;
}

@keyframes track-shine {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    outline: 1px solid transparent;
  }
  35% {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--primary) 45%, transparent);
    outline: 1px solid color-mix(in oklab, var(--primary) 70%, white 10%);
    background: color-mix(in oklab, var(--primary) 12%, transparent);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    outline: 1px solid transparent;
    background: transparent;
  }
}
</style>
