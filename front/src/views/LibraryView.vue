<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { useFavoritesStore } from '@/stores/favorites'
import { useArtistsQuery, useRecentAlbumsQuery, useMostPlayedQuery } from '@/composables/queries'
import { albumImageUrl } from '@/api/albums'
import { artistImageUrl } from '@/api/artists'
import TrackRow from '@/components/music/TrackRow.vue'
import { Input } from '@/components/ui/input'

const router = useRouter()
const playlists = usePlaylistsStore()
const favorites = useFavoritesStore()

const globalSearch = ref('')
const { data: artists, isPending: artistsLoading } = useArtistsQuery()
const { data: recentAlbums } = useRecentAlbumsQuery()
const { data: mostPlayed } = useMostPlayedQuery()

watch(mostPlayed, (tracks) => {
  if (tracks?.length) void favorites.fetchStatus(tracks.map((t) => t.id))
})

const swiperRef = ref<HTMLElement | null>(null)
const communityRef = ref<HTMLElement | null>(null)

const recentPlaylists = computed(() =>
  [...playlists.playlists]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4),
)

onMounted(() => Promise.all([
  playlists.fetchMyPlaylists(),
  playlists.fetchPublicPlaylists(),
]))

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
}

function scrollSwiper(direction: 'left' | 'right') {
  if (!swiperRef.value) return
  swiperRef.value.scrollBy({ left: direction === 'left' ? -560 : 560, behavior: 'smooth' })
}

function scrollCommunity(direction: 'left' | 'right') {
  if (!communityRef.value) return
  communityRef.value.scrollBy({ left: direction === 'left' ? -480 : 480, behavior: 'smooth' })
}

function goToSearch() {
  const query = globalSearch.value.trim()
  if (!query) return
  router.push({ name: 'search', query: { q: query } })
}
</script>

<template>
  <div class="flex flex-col gap-10">

    <section>
      <div class="max-w-[760px]">
        <Input
          v-model="globalSearch"
          placeholder="Search public playlists, songs, albums, artists"
          @keydown.enter="goToSearch"
        />
      </div>
    </section>

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

    <!-- Recently added albums swiper -->
    <section v-if="recentAlbums?.length">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Recently Added</h2>
        <div class="flex items-center gap-2">
          <button
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            aria-label="Scroll left"
            @click="scrollSwiper('left')"
          >‹</button>
          <button
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            aria-label="Scroll right"
            @click="scrollSwiper('right')"
          >›</button>
          <button
            class="text-[13px] font-semibold text-dimmed hover:text-foreground transition-colors ml-1"
            @click="router.push('/library/albums')"
          >See all albums</button>
        </div>
      </div>
      <div ref="swiperRef" class="swiper-track flex gap-4 overflow-x-auto pb-2">
        <div
          v-for="album in recentAlbums"
          :key="album.id"
          class="shrink-0 w-[160px] bg-card rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/library/albums/${album.id}`)"
        >
          <div class="relative mb-3">
            <img
              v-if="album.coverUrl"
              :src="albumImageUrl(album.id)"
              class="w-full aspect-square rounded object-cover"
            />
            <div v-else class="w-full aspect-square bg-muted rounded flex items-center justify-center text-[36px]">
              ♪
            </div>
            <span
              v-if="isNew(album.createdAt)"
              class="absolute top-1.5 right-1.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded"
            >NEW</span>
          </div>
          <div class="font-bold text-sm truncate">{{ album.title }}</div>
          <div class="text-xs text-muted-foreground truncate mt-0.5">{{ album.artist.name }}</div>
        </div>
      </div>
    </section>

    <!-- Community Playlists -->
    <section v-if="playlists.publicPlaylists.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold">Community Playlists</h2>
        <div class="flex items-center gap-2">
          <button
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            aria-label="Scroll left"
            @click="scrollCommunity('left')"
          >‹</button>
          <button
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            aria-label="Scroll right"
            @click="scrollCommunity('right')"
          >›</button>
        </div>
      </div>
      <div ref="communityRef" class="swiper-track flex gap-3 overflow-x-auto pb-2">
        <div
          v-for="pl in playlists.publicPlaylists"
          :key="pl.id"
          class="shrink-0 w-[180px] flex items-center gap-3 bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/playlists/${pl.id}`)"
        >
          <div class="size-10 bg-muted rounded flex items-center justify-center text-[18px] shrink-0">♫</div>
          <div class="flex flex-col min-w-0">
            <span class="text-[13px] font-semibold truncate">{{ pl.name }}</span>
            <span class="text-[11px] text-dimmed">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Most Played -->
    <section v-if="mostPlayed?.length">
      <h2 class="text-lg font-bold mb-4">Most Played</h2>
      <div class="flex flex-col">
        <TrackRow
          v-for="(track, i) in mostPlayed"
          :key="track.id"
          :track="track"
          :queue="mostPlayed"
          :index="i"
          :show-add-to-queue="true"
          :show-add-to-playlist="true"
        />
      </div>
    </section>

    <!-- Artists -->
    <section>
      <h2 class="text-lg font-bold mb-4">Artists</h2>
      <div v-if="artistsLoading" class="text-[13px] text-dimmed">Loading…</div>
      <div v-else-if="!artists?.length" class="text-[13px] text-dimmed">
        No artists yet. Ask an admin to add some music.
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
        <div
          v-for="artist in artists"
          :key="artist.id"
          class="bg-card rounded-lg p-4 cursor-pointer transition-colors hover:bg-muted"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <img
            v-if="artist.avatarUrl"
            :src="artistImageUrl(artist.id)"
            class="w-full aspect-square rounded-full object-cover mb-3"
          />
          <div v-else class="w-full aspect-square bg-muted rounded-full flex items-center justify-center text-[40px] font-extrabold text-muted-foreground mb-3">
            {{ artist.name[0]?.toUpperCase() }}
          </div>
          <div class="font-bold text-sm mb-1 truncate">{{ artist.name }}</div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.swiper-track {
  scrollbar-width: none;
}
.swiper-track::-webkit-scrollbar {
  display: none;
}
</style>
