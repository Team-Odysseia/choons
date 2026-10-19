<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { useFavoritesStore } from '@/stores/favorites'
import { useArtistsInfiniteQuery, useRecentAlbumsQuery, useMostPlayedQuery } from '@/composables/queries'
import TrackRow from '@/components/music/TrackRow.vue'
import TrackListHeader from '@/components/music/TrackListHeader.vue'
import AlbumCard from '@/components/music/AlbumCard.vue'
import PlaylistTile from '@/components/music/PlaylistTile.vue'
import ArtistCard from '@/components/music/ArtistCard.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader, SectionHeader, StatePlate } from '@/components/vfd'

const router = useRouter()
const playlists = usePlaylistsStore()
const favorites = useFavoritesStore()

const globalSearch = ref('')
const {
  data: artistPages,
  isPending: artistsLoading,
  hasNextPage: hasMoreArtists,
  isFetchingNextPage: loadingMoreArtists,
  fetchNextPage: loadMoreArtists,
} = useArtistsInfiniteQuery()
const artists = computed(() => artistPages.value?.pages.flat() ?? [])
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
  <div class="flex flex-col gap-9">
    <div class="flex flex-col gap-5 md:flex-row md:items-end md:gap-6">
      <PageHeader kicker="Source · Library" title="Library" class="flex-1" />
      <Input
        v-model="globalSearch"
        class="md:max-w-[380px]"
        placeholder="Search public playlists, songs, albums, artists"
        @keydown.enter="goToSearch"
      />
    </div>

    <section v-if="recentPlaylists.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader title="Your Playlists" :count="playlists.playlists.length" see-all @see-all="router.push('/playlists')" />
      <div class="flex flex-wrap gap-x-6 gap-y-5">
        <PlaylistTile v-for="pl in recentPlaylists" :key="pl.id" :playlist="pl" />
      </div>
    </section>

    <section v-if="recentAlbums?.length" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Recently Added"
        :count="recentAlbums.length"
        see-all
        see-all-label="See all albums"
        arrows
        prev-label="Scroll left"
        next-label="Scroll right"
        @see-all="router.push('/library/albums')"
        @prev="scrollSwiper('left')"
        @next="scrollSwiper('right')"
      />
      <div ref="swiperRef" data-testid="recent-albums" class="swiper-track flex gap-6 overflow-x-auto pb-2">
        <AlbumCard v-for="album in recentAlbums" :key="album.id" :album="album" :is-new="isNew(album.createdAt)" push />
      </div>
    </section>

    <section v-if="playlists.publicPlaylists.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Community Playlists"
        :count="playlists.publicPlaylists.length"
        arrows
        prev-label="Scroll left"
        next-label="Scroll right"
        @prev="scrollCommunity('left')"
        @next="scrollCommunity('right')"
      />
      <div ref="communityRef" class="swiper-track flex gap-6 overflow-x-auto pb-2">
        <PlaylistTile v-for="pl in playlists.publicPlaylists" :key="pl.id" :playlist="pl" />
      </div>
    </section>

    <section v-if="mostPlayed?.length" class="flex flex-col gap-1.5">
      <SectionHeader title="Most Played" class="mb-3" />
      <TrackListHeader />
      <TrackRow
        v-for="(track, i) in mostPlayed"
        :key="track.id"
        :track="track"
        :queue="mostPlayed"
        :index="i"
        :show-add-to-queue="true"
        :show-add-to-playlist="true"
      />
    </section>

    <section data-testid="artists-section" class="flex flex-col gap-[18px]">
      <SectionHeader title="Artists" :count="artists.length || undefined" />
      <StatePlate v-if="artistsLoading" kind="loading" code="READING…" message="Loading…" />
      <StatePlate v-else-if="!artists.length" code="NO ARTISTS" message="No artists yet. Ask an admin to add some music." />
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] justify-items-center gap-x-4 gap-y-6">
        <ArtistCard v-for="artist in artists" :key="artist.id" :artist="artist" />
      </div>
      <div v-if="hasMoreArtists" class="flex justify-center pt-2">
        <Button
          data-testid="more-artists"
          variant="outline"
          :disabled="loadingMoreArtists"
          @click="loadMoreArtists()"
        >{{ loadingMoreArtists ? 'Loading…' : 'Load more artists' }}</Button>
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
