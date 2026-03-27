<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import TrackRow from '@/components/music/TrackRow.vue'
import AddToPlaylistDialog from '@/components/music/AddToPlaylistDialog.vue'
import { Button } from '@/components/ui/button'
import { Play, Shuffle, ListPlus, Plus } from 'lucide-vue-next'
import { albumImageUrl } from '@/api/albums'

const route = useRoute()
const router = useRouter()
const music = useMusicStore()
const player = usePlayerStore()
const playlists = usePlaylistsStore()

const albumDialogOpen = ref(false)

onMounted(async () => {
  await music.fetchAlbum(route.params.id as string)
  await playlists.fetchMyPlaylists()
})
</script>

<template>
  <div v-if="!music.loading && music.currentAlbum">
    <div class="flex items-end gap-6 mb-8">
      <img
        v-if="music.currentAlbum.coverUrl"
        :src="albumImageUrl(music.currentAlbum.id)"
        class="size-[160px] rounded-lg object-cover shrink-0"
      />
      <div
        v-else
        class="size-[160px] bg-muted rounded-lg flex items-center justify-center text-[64px] shrink-0"
      >
        ♪
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Album</div>
        <h1 class="text-[28px] font-extrabold mb-1">{{ music.currentAlbum.title }}</h1>
        <div class="text-sm mt-2">
          <span
            class="font-semibold cursor-pointer hover:underline"
            @click="router.push(`/library/artists/${music.currentAlbum.artist.id}`)"
          >{{ music.currentAlbum.artist.name }}</span>
          <span class="text-[13px] text-dimmed"> · {{ music.currentAlbum.releaseYear }}</span>
          <span class="text-[13px] text-dimmed"> · {{ music.currentAlbumTracks.length }} tracks</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-6">
      <Button @click="player.playQueue(music.currentAlbumTracks)">
        <Play :size="16" />
        Play all
      </Button>
      <Button variant="outline" @click="player.playQueueShuffled(music.currentAlbumTracks)">
        <Shuffle :size="16" />
        Shuffle
      </Button>
      <Button
        variant="outline"
        :disabled="music.currentAlbumTracks.length === 0"
        @click="player.addTracksToQueue(music.currentAlbumTracks)"
      >
        <ListPlus :size="16" />
        Add to queue
      </Button>
      <Button
        variant="outline"
        :disabled="music.currentAlbumTracks.length === 0"
        @click="albumDialogOpen = true"
      >
        <Plus :size="16" />
        Add to playlist
      </Button>
    </div>

    <div v-if="music.currentAlbumTracks.length === 0" class="text-[13px] text-dimmed mt-6">
      No tracks in this album yet.
    </div>
    <div v-else class="mt-2">
      <TrackRow
        v-for="(track, i) in music.currentAlbumTracks"
        :key="track.id"
        :track="track"
        :queue="music.currentAlbumTracks"
        :index="i"
        :show-add-to-queue="true"
        :show-add-to-playlist="true"
      />
    </div>
  </div>
  <div v-else class="text-[13px] text-dimmed">Loading…</div>

  <AddToPlaylistDialog
    :open="albumDialogOpen"
    :tracks="music.currentAlbumTracks"
    @close="albumDialogOpen = false"
  />
</template>
