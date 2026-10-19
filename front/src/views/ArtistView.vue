<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useArtistQuery, useAlbumsQuery } from '@/composables/queries'
import { artistImageUrl } from '@/api/artists'
import AlbumCard from '@/components/music/AlbumCard.vue'
import { Readout, SectionHeader, StatePlate } from '@/components/vfd'
import { useRowSqueeze } from '@/composables/useRowSqueeze'

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: artist, isPending, isError } = useArtistQuery(id)
const { data: albums } = useAlbumsQuery(id)
const avatarFailed = ref(false)
const albumRow = ref<HTMLElement>()
useRowSqueeze(albumRow)
const avatar = computed(() => (artist.value?.avatarUrl && !avatarFailed.value ? artistImageUrl(artist.value.id) : null))
watch(id, () => {
  avatarFailed.value = false
})

function isNew(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 14 * 24 * 60 * 60 * 1000
}
</script>

<template>
  <div v-if="!isPending && artist" class="flex flex-col gap-9">
    <section class="vfd-well vfd-scanlines flex flex-col gap-6 rounded-lg p-6 md:flex-row md:items-center md:gap-8 md:p-7">
      <div class="size-[140px] shrink-0 rounded-full bg-[linear-gradient(to_top,#0D1114,#DCE3E8)] p-[5px] shadow-[0_10px_24px_#000,0_0_24px_#5CF6E833] md:size-[200px]">
        <img
          v-if="avatar"
          :src="avatar"
          :alt="artist.name + ' avatar'"
          class="size-full rounded-full object-cover"
          @error="avatarFailed = true"
        />
        <div
          v-else
          data-placeholder
          aria-hidden="true"
          class="flex size-full items-center justify-center rounded-full bg-[linear-gradient(200deg,#123B3A,#0A1114)] font-display text-6xl font-extrabold text-cyan glow-lg"
        >{{ artist.name[0]?.toUpperCase() }}</div>
      </div>
      <div class="flex min-w-0 flex-col gap-2.5">
        <span class="font-label text-[10px] uppercase tracking-[0.3em] text-amber glow-amber">Artist</span>
        <h1 class="break-words font-display text-[40px] font-extrabold uppercase leading-none text-cyan glow-lg md:text-[64px]">{{ artist.name }}</h1>
        <p v-if="artist.bio" class="max-w-[620px] text-[15px] leading-relaxed text-soft">{{ artist.bio }}</p>
        <div v-if="albums?.length" class="flex gap-7 pt-2">
          <Readout caption="Albums" :value="String(albums.length).padStart(2, '0')" size="sm" class="[&_[data-value]]:text-[22px]" />
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-[18px]">
      <SectionHeader title="Albums" :count="albums?.length" />
      <StatePlate v-if="!albums?.length" code="NO DISC" message="No albums yet." />
      <div v-else ref="albumRow" data-testid="artist-albums" class="flex flex-wrap gap-x-[46px] gap-y-8">
        <AlbumCard
          v-for="album in albums"
          :key="album.id"
          :album="album"
          :is-new="isNew(album.createdAt)"
          :meta="String(album.releaseYear)"
        />
      </div>
    </section>
  </div>
  <StatePlate v-else-if="isError" kind="error" code="ERR 404" message="This artist is not available." />
  <StatePlate v-else kind="loading" code="READING…" message="Loading…" />
</template>
