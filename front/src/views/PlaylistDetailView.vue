<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { useFavoritesStore } from '@/stores/favorites'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import { useAuthStore } from '@/stores/auth'
import TrackRow from '@/components/music/TrackRow.vue'
import TrackListHeader from '@/components/music/TrackListHeader.vue'
import { IconKey, SegmentedToggle, StatePlate, VfdBadge } from '@/components/vfd'
import { totalMinutes } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { X, Play, Shuffle, ListPlus, Globe, Lock, ListMusic, Share2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'

const route = useRoute()
const playlists = usePlaylistsStore()
const favorites = useFavoritesStore()
const player = usePlayerStore()
const party = usePartyStore()
const auth = useAuthStore()

const togglingVisibility = ref(false)
const loadError = ref<string | null>(null)

const playlist = computed(() =>
  playlists.current?.id === route.params.id ? playlists.current : null,
)

const isOwner = computed(
  () => !!auth.user && playlists.current?.ownerId === auth.user.id,
)

watch(
  () => route.params.id,
  async (id) => {
    if (typeof id !== 'string') return
    loadError.value = null
    try {
      await playlists.fetchPlaylist(id)
    } catch (e) {
      loadError.value = apiErrorMessage(e, 'This playlist is not available.')
    }
  },
  { immediate: true },
)

watch(
  () => playlists.current?.tracks,
  (tracks) => {
    if (tracks?.length) void favorites.fetchStatus(tracks.map((t) => t.id))
  },
)

async function removeTrack(trackId: string) {
  if (!playlists.current) return
  try {
    await playlists.removeTrack(playlists.current.id, trackId)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to remove track'))
  }
}

async function toggleVisibility() {
  if (!playlists.current) return
  togglingVisibility.value = true
  try {
    await playlists.setVisibility(playlists.current.id, !playlists.current.isPublic)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to change visibility'))
  } finally {
    togglingVisibility.value = false
  }
}

const visibilityOptions = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Private', icon: Lock },
]

const visibility = computed(() => (playlist.value?.isPublic ? 'public' : 'private'))
const minutes = computed(() => totalMinutes(playlist.value?.tracks ?? []))

function onVisibility(value: string) {
  if (value !== visibility.value && !togglingVisibility.value) void toggleVisibility()
}

function addAllToQueue() {
  if (!playlists.current) return
  if (party.inParty) {
    if (!party.canControl) {
      toast.error('Only DJs can add tracks to party queue')
      return
    }
    void party.addTracks(playlists.current.tracks)
    return
  }
  player.addTracksToQueue(playlists.current.tracks)
}
</script>

<template>
  <StatePlate v-if="loadError" kind="error" code="ERR" :message="loadError" />
  <div v-else-if="!playlists.loading && playlist" class="flex flex-col gap-8">
    <section class="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
      <div
        class="vfd-well vfd-scanlines flex size-[150px] shrink-0 flex-col items-center justify-center gap-2 rounded md:size-[180px]"
        aria-hidden="true"
      >
        <ListMusic :size="52" class="text-cyan drop-shadow-[0_0_12px_#5CF6E899]" />
        <span class="font-display text-[22px] font-extrabold text-cyan glow-sm">{{ playlist.tracks.length }} TRK</span>
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-2.5">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="font-label text-[10px] uppercase tracking-[0.3em] text-amber glow-amber">Playlist</span>
          <VfdBadge :tone="playlist.isPublic ? 'cyan' : 'mute'" :label="playlist.isPublic ? 'Public' : 'Private'" />
          <span class="flex-1" />
          <template v-if="isOwner">
            <Button
              v-if="playlist.isPublic"
              variant="ghost"
              size="sm"
              class="text-amber"
              @click="toast.info('This playlist is shared only inside this Choons instance')"
            >
              <template #icon><Share2 :size="13" aria-hidden="true" /></template>
              Internal shared
            </Button>
            <SegmentedToggle
              data-testid="visibility-toggle"
              :model-value="visibility"
              :options="visibilityOptions"
              @update:model-value="onVisibility"
            />
          </template>
        </div>
        <h1 class="break-words font-display text-[40px] font-extrabold uppercase leading-none text-cyan glow-lg md:text-[56px]">{{ playlist.name }}</h1>
        <span class="text-[15px] text-soft">
          {{ playlist.tracks.length }} tracks<template v-if="playlist.tracks.length"> · {{ minutes }} min</template>
        </span>
        <div class="flex flex-wrap items-center gap-2.5 pt-2.5">
          <Button
            v-if="!party.inParty"
            :disabled="playlist.tracks.length === 0"
            @click="player.playQueue(playlist.tracks)"
          >
            <template #icon><Play :size="14" aria-hidden="true" /></template>
            Play all
          </Button>
          <Button
            v-if="!party.inParty"
            variant="outline"
            :disabled="playlist.tracks.length === 0"
            @click="player.playQueueShuffled(playlist.tracks)"
          >
            <template #icon><Shuffle :size="14" aria-hidden="true" /></template>
            Shuffle
          </Button>
          <Button variant="outline" :disabled="playlist.tracks.length === 0" @click="addAllToQueue">
            <template #icon><ListPlus :size="14" aria-hidden="true" /></template>
            {{ party.inParty ? 'Add to party queue' : 'Add to queue' }}
          </Button>
        </div>
      </div>
    </section>

    <StatePlate v-if="playlist.tracks.length === 0" code="BLANK TAPE" message="No tracks yet. Add some from an album." />

    <section v-else class="flex flex-col gap-1">
      <TrackListHeader />
      <div v-for="(track, i) in playlist.tracks" :key="track.id" class="group/row flex items-center gap-1">
        <TrackRow class="flex-1" :track="track" :queue="playlist.tracks" :index="i" />
        <IconKey
          v-if="isOwner"
          bare
          :icon="X"
          label="Remove"
          :size="30"
          class="opacity-0 transition-opacity hover:text-red! group-hover/row:opacity-100 focus-visible:opacity-100"
          @click="removeTrack(track.id)"
        />
      </div>
    </section>
  </div>
  <StatePlate v-else kind="loading" code="READING…" message="Loading…" />
</template>
