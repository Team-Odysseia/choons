<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import TrackRow from '@/components/music/TrackRow.vue'
import { Button } from '@/components/ui/button'
import { X, Play, Shuffle } from 'lucide-vue-next'

const route = useRoute()
const playlists = usePlaylistsStore()
const player = usePlayerStore()

onMounted(() => playlists.fetchPlaylist(route.params.id as string))

async function removeTrack(trackId: string) {
  await playlists.removeTrack(playlists.current!.id, trackId)
}
</script>

<template>
  <div v-if="!playlists.loading && playlists.current">
    <div class="flex items-end gap-6 mb-8">
      <div
        class="size-[160px] bg-muted rounded-lg flex items-center justify-center text-[64px] shrink-0"
      >
        ♫
      </div>
      <div>
        <div class="text-xs font-bold uppercase tracking-widest text-dimmed mb-1">Playlist</div>
        <h1 class="text-[28px] font-extrabold mb-2">{{ playlists.current.name }}</h1>
        <span class="text-[13px] text-dimmed">{{ playlists.current.tracks.length }} tracks</span>
      </div>
    </div>

    <div class="flex items-center gap-2 mb-6">
      <Button
        :disabled="playlists.current.tracks.length === 0"
        @click="player.playQueue(playlists.current!.tracks)"
      >
        <Play :size="16" />
        Play all
      </Button>
      <Button
        variant="outline"
        :disabled="playlists.current.tracks.length === 0"
        @click="player.playQueueShuffled(playlists.current!.tracks)"
      >
        <Shuffle :size="16" />
        Shuffle
      </Button>
    </div>

    <div v-if="playlists.current.tracks.length === 0" class="text-[13px] text-dimmed">
      No tracks yet. Add some from an album.
    </div>

    <div v-else class="mt-2">
      <div
        v-for="(track, i) in playlists.current.tracks"
        :key="track.id"
        class="flex items-center group/row"
      >
        <TrackRow
          class="flex-1"
          :track="track"
          :queue="playlists.current.tracks"
          :index="i"
        />
        <button
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
