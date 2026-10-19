<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isCancel } from 'axios'
import { Input } from '@/components/ui/input'
import { isAbortError } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { getPublicPlaylists } from '@/api/playlists'
import { searchTracks } from '@/api/tracks'
import { searchAlbums } from '@/api/albums'
import { searchArtists } from '@/api/artists'
import AlbumCard from '@/components/music/AlbumCard.vue'
import ArtistCard from '@/components/music/ArtistCard.vue'
import PlaylistTile from '@/components/music/PlaylistTile.vue'
import SongCard from '@/components/music/SongCard.vue'
import { PageHeader, Readout, SectionHeader, StatePlate } from '@/components/vfd'
import { useRowSqueeze } from '@/composables/useRowSqueeze'
import type {
  PlaylistSummaryResponse,
  TrackResponse,
  AlbumResponse,
  ArtistResponse,
} from '@/api/types'

const router = useRouter()
const route = useRoute()

const searchInput = ref(typeof route.query.q === 'string' ? route.query.q : '')
const loading = ref(false)

const playlists = ref<PlaylistSummaryResponse[]>([])
const tracks = ref<TrackResponse[]>([])
const albums = ref<AlbumResponse[]>([])
const artists = ref<ArtistResponse[]>([])

const showAllPlaylists = ref(false)
const showAllTracks = ref(false)
const showAllAlbums = ref(false)
const showAllArtists = ref(false)

const playlistsRef = ref<HTMLElement | null>(null)
const tracksRef = ref<HTMLElement | null>(null)
const albumsRef = ref<HTMLElement | null>(null)
const artistsRef = ref<HTMLElement | null>(null)
const albumsSqueezeRef = computed(() => albumsRef.value ?? undefined)
useRowSqueeze(albumsSqueezeRef, 56, () => showAllAlbums.value)

let searchDebounce: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

watch(
  () => route.query.q,
  (value) => {
    searchInput.value = typeof value === 'string' ? value : ''
    void runSearch(searchInput.value)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
  if (abortController) abortController.abort()
})

const playlistsPreview = computed(() =>
  showAllPlaylists.value ? playlists.value : playlists.value.slice(0, 20),
)
const tracksPreview = computed(() =>
  showAllTracks.value ? tracks.value : tracks.value.slice(0, 20),
)
const albumsPreview = computed(() =>
  showAllAlbums.value ? albums.value : albums.value.slice(0, 20),
)
const artistsPreview = computed(() =>
  showAllArtists.value ? artists.value : artists.value.slice(0, 20),
)

const hits = computed(
  () => playlists.value.length + tracks.value.length + albums.value.length + artists.value.length,
)

const hasResults = computed(
  () => playlists.value.length || tracks.value.length || albums.value.length || artists.value.length,
)

function submitSearch() {
  const query = searchInput.value.trim()
  router.replace({ name: 'search', query: query ? { q: query } : {} })
}

function onInput() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    submitSearch()
  }, 220)
}

function scrollSection(el: HTMLElement | null, direction: 'left' | 'right') {
  if (!el) return
  el.scrollBy({ left: direction === 'left' ? -560 : 560, behavior: 'smooth' })
}

function openTrackInAlbum(albumId: string, trackId: string) {
  router.push({
    path: `/library/albums/${albumId}`,
    query: { track: trackId },
  })
}

async function runSearch(rawQuery: string) {
  const query = rawQuery.trim()
  showAllPlaylists.value = false
  showAllTracks.value = false
  showAllAlbums.value = false
  showAllArtists.value = false

  if (!query) {
    playlists.value = []
    tracks.value = []
    albums.value = []
    artists.value = []
    return
  }

  if (abortController) abortController.abort()
  abortController = new AbortController()
  const signal = abortController.signal

  loading.value = true
  try {
    const [publicPlaylists, trackResults, albumResults, artistResults] = await Promise.all([
      getPublicPlaylists(signal),
      searchTracks(query, { page: 0, size: 200, signal }),
      searchAlbums(query, { page: 0, size: 200, signal }),
      searchArtists(query, 0, 200, signal),
    ])

    if (signal.aborted) return

    const q = query.toLowerCase()
    playlists.value = publicPlaylists.filter((pl) => pl.name.toLowerCase().includes(q))
    tracks.value = trackResults
    albums.value = albumResults
    artists.value = artistResults
  } catch (e) {
    if (!isCancel(e) && !isAbortError(e)) throw e
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageHeader kicker="Source · Search" title="Search" />

    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        v-model="searchInput"
        class="flex-1"
        aria-label="Search query"
        placeholder="Search public playlists, songs, albums, artists"
        @input="onInput"
        @keydown.enter="submitSearch"
      />
      <div class="flex items-end gap-4">
        <Button @click="submitSearch">Search</Button>
        <Readout data-testid="hits-readout" caption="Hits" :value="String(hits).padStart(2, '0')" size="sm" class="[&_[data-value]]:text-[26px]" />
      </div>
    </div>

    <StatePlate
      v-if="!searchInput.trim()"
      code="STANDBY"
      message="Start typing to search across playlists, songs, albums, and artists."
    />
    <StatePlate v-else-if="loading" kind="loading" code="SEEK…" message="Searching…" />
    <StatePlate v-else-if="!hasResults" code="NO SIGNAL" message="No results found." />

    <section v-if="playlists.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Public Playlists"
        :count="playlists.length"
        see-all
        :expanded="showAllPlaylists"
        :arrows="!showAllPlaylists"
        @see-all="showAllPlaylists = !showAllPlaylists"
        @prev="scrollSection(playlistsRef, 'left')"
        @next="scrollSection(playlistsRef, 'right')"
      />
      <div
        ref="playlistsRef"
        :class="showAllPlaylists ? 'flex flex-wrap gap-6' : 'swiper-track flex gap-6 overflow-x-auto pb-2'"
      >
        <PlaylistTile v-for="pl in playlistsPreview" :key="pl.id" :playlist="pl" />
      </div>
    </section>

    <section v-if="tracks.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Songs"
        :count="tracks.length"
        see-all
        :expanded="showAllTracks"
        :arrows="!showAllTracks"
        @see-all="showAllTracks = !showAllTracks"
        @prev="scrollSection(tracksRef, 'left')"
        @next="scrollSection(tracksRef, 'right')"
      />
      <div
        ref="tracksRef"
        :class="
          showAllTracks
            ? 'grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4'
            : 'swiper-track grid auto-cols-[300px] grid-flow-col grid-rows-2 gap-4 overflow-x-auto pb-2'
        "
      >
        <SongCard
          v-for="track in tracksPreview"
          :key="track.id"
          :track="track"
          @play="openTrackInAlbum(track.album.id, track.id)"
        />
      </div>
    </section>

    <section v-if="albums.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Albums"
        :count="albums.length"
        see-all
        :expanded="showAllAlbums"
        :arrows="!showAllAlbums"
        @see-all="showAllAlbums = !showAllAlbums"
        @prev="scrollSection(albumsRef, 'left')"
        @next="scrollSection(albumsRef, 'right')"
      />
      <div
        ref="albumsRef"
        :class="showAllAlbums ? 'flex flex-wrap gap-x-6 gap-y-8' : 'swiper-track flex gap-6 overflow-x-auto pb-2'"
      >
        <AlbumCard v-for="album in albumsPreview" :key="album.id" :album="album" :push="!showAllAlbums" />
      </div>
    </section>

    <section v-if="artists.length > 0" class="flex flex-col gap-[18px]">
      <SectionHeader
        title="Artists"
        :count="artists.length"
        see-all
        :expanded="showAllArtists"
        :arrows="!showAllArtists"
        @see-all="showAllArtists = !showAllArtists"
        @prev="scrollSection(artistsRef, 'left')"
        @next="scrollSection(artistsRef, 'right')"
      />
      <div
        ref="artistsRef"
        :class="showAllArtists ? 'flex flex-wrap gap-x-6 gap-y-8' : 'swiper-track flex gap-6 overflow-x-auto pb-2'"
      >
        <ArtistCard v-for="artist in artistsPreview" :key="artist.id" :artist="artist" />
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
