<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAllAlbumsInfiniteQuery } from '@/composables/queries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AlbumCard from '@/components/music/AlbumCard.vue'
import { PageHeader, StatePlate } from '@/components/vfd'

const search = ref('')
const debouncedSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    debouncedSearch.value = search.value.trim()
  }, 220)
})

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})

const {
  data: albumPages,
  isPending,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
} = useAllAlbumsInfiniteQuery(debouncedSearch)
const albums = computed(() => albumPages.value?.pages.flat() ?? [])

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-5 md:flex-row md:items-end md:gap-6">
      <PageHeader kicker="Library · All Albums" title="All Albums" class="flex-1" />
      <Input v-model="search" class="md:max-w-[340px]" placeholder="Search album or artist" />
    </div>

    <StatePlate v-if="isPending" kind="loading" code="READING…" message="Loading…" />
    <StatePlate v-else-if="!albums.length" code="NO ALBUMS" message="No albums yet. Ask an admin to add some music." />
    <div
      v-else
      data-testid="album-grid"
      class="grid grid-cols-[repeat(auto-fill,minmax(184px,1fr))] justify-items-center gap-x-6 gap-y-8 md:justify-items-start"
    >
      <AlbumCard
        v-for="album in albums"
        :key="album.id"
        :album="album"
        :is-new="isNew(album.createdAt)"
        :meta="`${album.artist.name} · ${album.releaseYear}`"
      />
    </div>
    <div v-if="hasNextPage" class="flex justify-center">
      <Button
        data-testid="more-albums"
        variant="outline"
        :disabled="isFetchingNextPage"
        @click="fetchNextPage()"
      >{{ isFetchingNextPage ? 'Loading…' : 'Load more albums' }}</Button>
    </div>
  </div>
</template>
