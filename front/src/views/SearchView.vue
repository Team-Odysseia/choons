<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getPublicPlaylists } from '@/api/playlists'
import { searchTracks } from '@/api/tracks'
import { searchAlbums, albumImageUrl } from '@/api/albums'
import { searchArtists, artistImageUrl } from '@/api/artists'
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

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
  } catch (e: any) {
    if (e.name !== 'AbortError' && e.name !== 'CanceledError') throw e
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section>
      <div class="max-w-[760px] flex items-center gap-2">
        <Input
          v-model="searchInput"
          placeholder="Search public playlists, songs, albums, artists"
          @input="onInput"
          @keydown.enter="submitSearch"
        />
        <Button variant="outline" @click="submitSearch">Search</Button>
      </div>
    </section>

    <div v-if="!searchInput.trim()" class="text-[13px] text-dimmed">
      Start typing to search across playlists, songs, albums, and artists.
    </div>
    <div v-else-if="loading" class="text-[13px] text-dimmed">Searching…</div>
    <div v-else-if="!hasResults" class="text-[13px] text-dimmed">No results found.</div>

    <section v-if="playlists.length > 0" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold">Public Playlists ({{ playlists.length }})</h2>
        <div class="flex items-center gap-2">
          <button
            v-if="!showAllPlaylists"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(playlistsRef, 'left')"
          >‹</button>
          <button
            v-if="!showAllPlaylists"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(playlistsRef, 'right')"
          >›</button>
          <Button
            variant="outline"
            @click="showAllPlaylists = !showAllPlaylists"
          >{{ showAllPlaylists ? 'Show less' : 'See all' }}</Button>
        </div>
      </div>

      <div
        v-if="!showAllPlaylists"
        ref="playlistsRef"
        class="swiper-track flex gap-3 overflow-x-auto pb-2"
      >
        <div
          v-for="pl in playlistsPreview"
          :key="pl.id"
          class="shrink-0 w-[210px] flex items-center gap-3 bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/playlists/${pl.id}`)"
        >
          <div class="size-10 bg-muted rounded flex items-center justify-center text-[18px] shrink-0">♫</div>
          <div class="flex flex-col min-w-0">
            <span class="text-[13px] font-semibold truncate">{{ pl.name }}</span>
            <span class="text-[11px] text-dimmed">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        <div
          v-for="pl in playlistsPreview"
          :key="pl.id"
          class="flex items-center gap-3 bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors"
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

    <section v-if="tracks.length > 0" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold">Songs ({{ tracks.length }})</h2>
        <div class="flex items-center gap-2">
          <button
            v-if="!showAllTracks"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(tracksRef, 'left')"
          >‹</button>
          <button
            v-if="!showAllTracks"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(tracksRef, 'right')"
          >›</button>
          <Button variant="outline" @click="showAllTracks = !showAllTracks">{{ showAllTracks ? 'Show less' : 'See all' }}</Button>
        </div>
      </div>

      <div
        v-if="!showAllTracks"
        ref="tracksRef"
        class="swiper-track flex gap-3 overflow-x-auto pb-2"
      >
        <div
          v-for="track in tracksPreview"
          :key="track.id"
          class="shrink-0 w-[250px] bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors"
          @click="openTrackInAlbum(track.album.id, track.id)"
        >
          <div class="text-sm font-semibold truncate">{{ track.title }}</div>
          <div class="text-xs text-muted-foreground truncate mt-0.5">{{ track.artist.name }} · {{ track.album.title }}</div>
          <div class="text-xs text-dimmed mt-1">{{ formatDuration(track.durationSeconds) }}</div>
        </div>
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
        <div
          v-for="track in tracksPreview"
          :key="track.id"
          class="bg-card rounded-lg px-3 py-3 cursor-pointer hover:bg-muted transition-colors"
          @click="openTrackInAlbum(track.album.id, track.id)"
        >
          <div class="text-sm font-semibold truncate">{{ track.title }}</div>
          <div class="text-xs text-muted-foreground truncate mt-0.5">{{ track.artist.name }} · {{ track.album.title }}</div>
          <div class="text-xs text-dimmed mt-1">{{ formatDuration(track.durationSeconds) }}</div>
        </div>
      </div>
    </section>

    <section v-if="albums.length > 0" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold">Albums ({{ albums.length }})</h2>
        <div class="flex items-center gap-2">
          <button
            v-if="!showAllAlbums"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(albumsRef, 'left')"
          >‹</button>
          <button
            v-if="!showAllAlbums"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(albumsRef, 'right')"
          >›</button>
          <Button variant="outline" @click="showAllAlbums = !showAllAlbums">{{ showAllAlbums ? 'Show less' : 'See all' }}</Button>
        </div>
      </div>

      <div
        v-if="!showAllAlbums"
        ref="albumsRef"
        class="swiper-track flex gap-3 overflow-x-auto pb-2"
      >
        <div
          v-for="album in albumsPreview"
          :key="album.id"
          class="shrink-0 w-[180px] bg-card rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/library/albums/${album.id}`)"
        >
          <img v-if="album.coverUrl" :src="albumImageUrl(album.id)" :alt="album.title + ' cover'" class="w-full aspect-square rounded object-cover mb-2" />
          <div v-else class="w-full aspect-square bg-muted rounded flex items-center justify-center text-[38px] mb-2">♪</div>
          <div class="text-sm font-semibold truncate">{{ album.title }}</div>
          <div class="text-xs text-muted-foreground truncate">{{ album.artist.name }}</div>
        </div>
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        <div
          v-for="album in albumsPreview"
          :key="album.id"
          class="bg-card rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/library/albums/${album.id}`)"
        >
          <img v-if="album.coverUrl" :src="albumImageUrl(album.id)" :alt="album.title + ' cover'" class="w-full aspect-square rounded object-cover mb-2" />
          <div v-else class="w-full aspect-square bg-muted rounded flex items-center justify-center text-[38px] mb-2">♪</div>
          <div class="text-sm font-semibold truncate">{{ album.title }}</div>
          <div class="text-xs text-muted-foreground truncate">{{ album.artist.name }}</div>
        </div>
      </div>
    </section>

    <section v-if="artists.length > 0" class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold">Artists ({{ artists.length }})</h2>
        <div class="flex items-center gap-2">
          <button
            v-if="!showAllArtists"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(artistsRef, 'left')"
          >‹</button>
          <button
            v-if="!showAllArtists"
            class="size-7 rounded-full bg-card hover:bg-muted transition-colors flex items-center justify-center text-dimmed hover:text-foreground"
            @click="scrollSection(artistsRef, 'right')"
          >›</button>
          <Button variant="outline" @click="showAllArtists = !showAllArtists">{{ showAllArtists ? 'Show less' : 'See all' }}</Button>
        </div>
      </div>

      <div
        v-if="!showAllArtists"
        ref="artistsRef"
        class="swiper-track flex gap-3 overflow-x-auto pb-2"
      >
        <div
          v-for="artist in artistsPreview"
          :key="artist.id"
          class="shrink-0 w-[170px] bg-card rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <img v-if="artist.avatarUrl" :src="artistImageUrl(artist.id)" :alt="artist.name + ' avatar'" class="w-full aspect-square rounded-full object-cover mb-2" />
          <div v-else class="w-full aspect-square bg-muted rounded-full flex items-center justify-center text-[36px] font-extrabold text-muted-foreground mb-2">
            {{ artist.name[0]?.toUpperCase() }}
          </div>
          <div class="text-sm font-semibold truncate">{{ artist.name }}</div>
        </div>
      </div>
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
        <div
          v-for="artist in artistsPreview"
          :key="artist.id"
          class="bg-card rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors"
          @click="router.push(`/library/artists/${artist.id}`)"
        >
          <img v-if="artist.avatarUrl" :src="artistImageUrl(artist.id)" :alt="artist.name + ' avatar'" class="w-full aspect-square rounded-full object-cover mb-2" />
          <div v-else class="w-full aspect-square bg-muted rounded-full flex items-center justify-center text-[36px] font-extrabold text-muted-foreground mb-2">
            {{ artist.name[0]?.toUpperCase() }}
          </div>
          <div class="text-sm font-semibold truncate">{{ artist.name }}</div>
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
