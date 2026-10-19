<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { BaseDialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlaylistsStore } from '@/stores/playlists'
import type { TrackResponse } from '@/api/types'
import { apiErrorMessage, apiStatus } from '@/lib/errors'

const props = defineProps<{
  open: boolean
  tracks: TrackResponse[]
}>()

const emit = defineEmits<{ close: [] }>()

const playlists = usePlaylistsStore()

const newPlaylistName = ref('')
const creating = ref(false)
const addingTo = ref<string | null>(null)

const subtitle = computed(() => {
  const firstTrack = props.tracks[0]
  if (!firstTrack) return 'No tracks selected'
  if (props.tracks.length === 1) return `"${firstTrack.title}"`
  return `${props.tracks.length} tracks from "${firstTrack.album.title}"`
})

async function addTracks(playlistId: string, playlistName: string) {
  let added = 0
  let duplicates = 0
  for (const track of props.tracks) {
    try {
      await playlists.addTrack(playlistId, track.id)
      added++
    } catch (e) {
      if (apiStatus(e) !== 409) {
        toast.error(apiErrorMessage(e, 'Failed to add to playlist'))
        return false
      }
      duplicates++
    }
  }
  if (added === 0) {
    toast.info(`Already in "${playlistName}"`)
  } else if (duplicates > 0) {
    toast.success(`Added ${added} to "${playlistName}", ${duplicates} already there`)
  } else {
    toast.success(`Added to "${playlistName}"`)
  }
  return true
}

async function addToPlaylist(playlistId: string) {
  addingTo.value = playlistId
  try {
    const pl = playlists.playlists.find((p) => p.id === playlistId)
    if (await addTracks(playlistId, pl?.name ?? 'playlist')) emit('close')
  } finally {
    addingTo.value = null
  }
}

async function createAndAdd() {
  const name = newPlaylistName.value.trim()
  if (!name) return
  creating.value = true
  try {
    const created = await playlists.createPlaylist(name)
    newPlaylistName.value = ''
    if (await addTracks(created.id, created.name)) emit('close')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to create playlist'))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <BaseDialog :open="open" title="Add to playlist" @close="emit('close')">
    <div class="px-5 pb-5">
      <p class="mb-4 text-[13px] text-soft">{{ subtitle }}</p>

      <!-- Existing playlists -->
      <div v-if="playlists.playlists.length > 0" class="mb-4 flex flex-col gap-1.5">
        <button
          v-for="pl in playlists.playlists"
          :key="pl.id"
          class="group flex w-full items-center justify-between rounded border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-cyan-dim hover:bg-panel-2"
          :disabled="addingTo === pl.id"
          @click="addToPlaylist(pl.id)"
        >
          <div class="flex flex-col min-w-0">
            <span class="truncate text-sm text-fg group-hover:text-cyan">{{ pl.name }}</span>
            <span class="text-xs text-soft">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
          </div>
          <span
            class="ml-3 shrink-0 font-label text-[9px] uppercase tracking-[0.18em] text-cyan opacity-0 transition-opacity glow-sm group-hover:opacity-100 group-focus-visible:opacity-100"
          >{{ addingTo === pl.id ? 'Adding…' : 'Add' }}</span>
        </button>
      </div>
      <p v-else class="mb-4 text-[13px] text-soft">No playlists yet.</p>

      <!-- Divider -->
      <div class="flex items-center gap-3 mb-4">
        <div class="h-px flex-1 bg-line" />
        <span class="font-label text-[8px] uppercase tracking-[0.2em] text-faint">or create new</span>
        <div class="h-px flex-1 bg-line" />
      </div>

      <!-- Create new playlist -->
      <form class="flex items-center gap-2.5" @submit.prevent="createAndAdd">
        <Input
          v-model="newPlaylistName"
          placeholder="Playlist name"
          :disabled="creating"
          class="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          :disabled="!newPlaylistName.trim() || creating"
        >{{ creating ? 'Creating…' : 'Create' }}</Button>
      </form>
    </div>
  </BaseDialog>
</template>
