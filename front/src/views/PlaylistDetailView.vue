<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { useFavoritesStore } from '@/stores/favorites'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import { useAuthStore } from '@/stores/auth'
import TrackRow from '@/components/music/TrackRow.vue'
import { Button } from '@/components/ui/button'
import { X, Play, Shuffle, ListPlus, Globe, Lock } from 'lucide-vue-next'
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
  <div v-if="loadError" class="text-[13px] text-dimmed">{{ loadError }}</div>
  <div v-else-if="!playlists.loading && playlist">
    <div class="flex items-end gap-6 mb-8">
      <div
        class="size-[160px] bg-muted rounded-lg flex items-center justify-center text-[64px] shrink-0"
      >
        ♫
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Playlist</div>
        <h1 class="text-[28px] font-extrabold mb-2">{{ playlist.name }}</h1>
        <div class="flex items-center gap-2">
          <span class="text-[13px] text-dimmed">{{ playlist.tracks.length }} tracks</span>
          <span
            v-if="playlist.isPublic"
            class="flex items-center gap-1 text-[12px] text-primary font-medium"
          >
            <Globe :size="12" />
            Public
          </span>
          <span v-else class="flex items-center gap-1 text-[12px] text-dimmed">
            <Lock :size="12" />
            Private
          </span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-6 flex-wrap">
      <Button
        v-if="!party.inParty"
        :disabled="playlist.tracks.length === 0"
        @click="player.playQueue(playlist.tracks)"
      >
        <Play :size="16" />
        Play all
      </Button>
      <Button
        v-if="!party.inParty"
        variant="outline"
        :disabled="playlist.tracks.length === 0"
        @click="player.playQueueShuffled(playlist.tracks)"
      >
        <Shuffle :size="16" />
        Shuffle
      </Button>
      <Button
        variant="outline"
        :disabled="playlist.tracks.length === 0"
        @click="addAllToQueue"
      >
        <ListPlus :size="16" />
        {{ party.inParty ? 'Add to party queue' : 'Add to queue' }}
      </Button>
      <template v-if="isOwner">
        <Button
          variant="outline"
          :disabled="togglingVisibility"
          @click="toggleVisibility"
        >
          <Globe v-if="!playlist.isPublic" :size="16" />
          <Lock v-else :size="16" />
          {{ playlist.isPublic ? 'Make private' : 'Make public' }}
        </Button>
        <Button
          v-if="playlist.isPublic"
          variant="outline"
          @click="toast.info('This playlist is shared only inside this Choons instance')"
        >
          <Globe :size="16" />
          Internal shared
        </Button>
      </template>
    </div>

    <div v-if="playlist.tracks.length === 0" class="text-[13px] text-dimmed">
      No tracks yet. Add some from an album.
    </div>

    <div v-else class="mt-2">
      <div
        v-for="(track, i) in playlist.tracks"
        :key="track.id"
        class="flex items-center group/row"
      >
        <TrackRow
          class="flex-1"
          :track="track"
          :queue="playlist.tracks"
          :index="i"
        />
        <button
          v-if="isOwner"
          class="size-8 rounded-full flex items-center justify-center text-dimmed opacity-0 group-hover/row:opacity-100 hover:text-destructive transition-all shrink-0"
          title="Remove"
          @click="removeTrack(track.id)"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>
</template>
