<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAlbumQuery, useAlbumTracksQuery } from '@/composables/queries'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import { usePlaylistsStore } from '@/stores/playlists'
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

const id = computed(() => route.params.id as string)
const { data: album, isPending } = useAlbumQuery(id)
const { data: tracks } = useAlbumTracksQuery(id)

const albumDialogOpen = ref(false)

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
      <TrackRow
        v-for="(track, i) in trackList"
        :key="track.id"
        :track="track"
        :queue="trackList"
        :index="i"
        :show-add-to-queue="true"
        :show-add-to-playlist="true"
      />
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>

  <AddToPlaylistDialog
    :open="albumDialogOpen"
    :tracks="trackList"
    @close="albumDialogOpen = false"
  />
</template>
