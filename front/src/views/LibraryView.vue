<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMusicStore } from '@/stores/music'
import { usePlaylistsStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'
import TrackRow from '@/components/music/TrackRow.vue'

const router = useRouter()
const music = useMusicStore()
const playlists = usePlaylistsStore()
const player = usePlayerStore()

const recentPlaylists = computed(() =>
  [...playlists.playlists]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4),
)

onMounted(() => Promise.all([
  music.fetchArtists(),
  music.fetchRecentTracks(),
  playlists.fetchMyPlaylists(),
]))

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <div class="flex flex-col gap-10">

    <!-- Playlists quick access -->
    <section v-if="recentPlaylists.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Your Playlists</h2>
        <button
          class="text-[13px] font-semibold text-dimmed hover:text-foreground transition-colors"
          @click="router.push('/playlists')"
        >See all</button>
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        <div
          v-for="pl in recentPlaylists"
          :key="pl.id"
          class="flex items-center gap-3 bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors group"
          @click="router.push(`/playlists/${pl.id}`)"
        >
          <div class="size-10 bg-muted group-hover:bg-accent rounded flex items-center justify-center text-[18px] shrink-0 transition-colors">♫</div>
          <div class="flex flex-col min-w-0">
            <span class="text-[13px] font-semibold truncate">{{ pl.name }}</span>
            <span class="text-[11px] text-dimmed">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Recently added tracks -->
    <section v-if="music.recentTracks.length > 0">
      <h2 class="text-lg font-bold mb-4">Recently Added</h2>
      <div class="flex flex-col">
        <!-- Header row -->
        <div class="grid [grid-template-columns:32px_1fr_1fr_60px_80px] items-center gap-3 px-3 pb-2 border-b border-border mb-1">
          <span class="text-[11px] text-dimmed text-right">#</span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed">Title</span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed">Album</span>
          <span class="text-[11px] font-semibold uppercase tracking-wider text-dimmed text-right">Time</span>
          <span></span>
        </div>
        <TrackRow
          v-for="(track, i) in music.recentTracks"
          :key="track.id"
          :track="track"
          :queue="music.recentTracks"
          :index="i"
          :show-add-to-playlist="true"
        />
      </div>
    </section>

    <!-- Artists -->
    <section>
      <h2 class="text-lg font-bold mb-4">Artists</h2>
      <div v-if="music.loading" class="text-[13px] text-dimmed">Loading…</div>
      <div v-else-if="music.artists.length === 0" class="text-[13px] text-dimmed">
        No artists yet. Ask an admin to add some music.
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        <div
          v-for="artist in music.artists"
          :key="artist.id"
          class="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <div class="w-full aspect-square bg-muted rounded-full flex items-center justify-center text-[40px] font-extrabold text-muted-foreground mb-3">
            {{ artist.name[0]?.toUpperCase() }}
          </div>
          <div class="font-bold text-sm mb-1 truncate">{{ artist.name }}</div>
        </div>
      </div>
    </section>

  </div>
</template>
