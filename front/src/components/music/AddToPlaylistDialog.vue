<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { BaseDialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlaylistsStore } from '@/stores/playlists'
import type { TrackResponse } from '@/api/types'

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
  if (props.tracks.length === 1) return `"${props.tracks[0].title}"`
  return `${props.tracks.length} tracks from "${props.tracks[0].album.title}"`
})

async function addToPlaylist(playlistId: string) {
  addingTo.value = playlistId
  try {
    for (const track of props.tracks) {
      await playlists.addTrack(playlistId, track.id)
    }
    const pl = playlists.playlists.find((p) => p.id === playlistId)
    toast.success(`Added to "${pl?.name ?? 'playlist'}"`)
    emit('close')
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
    for (const track of props.tracks) {
      await playlists.addTrack(created.id, track.id)
    }
    toast.success(`Added to "${created.name}"`)
    newPlaylistName.value = ''
    emit('close')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <BaseDialog :open="open" title="Add to playlist" @close="emit('close')">
    <div class="px-5 pb-5">
      <p class="text-[13px] text-muted-foreground mb-4">{{ subtitle }}</p>

      <!-- Existing playlists -->
      <div v-if="playlists.playlists.length > 0" class="flex flex-col gap-1 mb-4">
        <button
          v-for="pl in playlists.playlists"
          :key="pl.id"
          class="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group"
          :disabled="addingTo === pl.id"
          @click="addToPlaylist(pl.id)"
        >
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-medium truncate">{{ pl.name }}</span>
            <span class="text-xs text-muted-foreground">{{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}</span>
          </div>
          <span
            class="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3"
          >{{ addingTo === pl.id ? 'Adding…' : 'Add' }}</span>
        </button>
      </div>
      <p v-else class="text-[13px] text-dimmed mb-4">No playlists yet.</p>

      <!-- Divider -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1 h-px bg-border" />
        <span class="text-[11px] text-dimmed font-medium uppercase tracking-wider">or create new</span>
        <div class="flex-1 h-px bg-border" />
      </div>

      <!-- Create new playlist -->
      <form class="flex gap-2" @submit.prevent="createAndAdd">
        <Input
          v-model="newPlaylistName"
          placeholder="Playlist name"
          :disabled="creating"
          class="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          :disabled="!newPlaylistName.trim() || creating"
        >{{ creating ? 'Creating…' : 'Create' }}</Button>
      </form>
    </div>
  </BaseDialog>
</template>
