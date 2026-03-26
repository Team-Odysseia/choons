<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-vue-next'

const router = useRouter()
const playlists = usePlaylistsStore()

const newName = ref('')
const creating = ref(false)
const showForm = ref(false)

onMounted(() => playlists.fetchMyPlaylists())

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const pl = await playlists.createPlaylist(newName.value.trim())
    newName.value = ''
    showForm.value = false
    router.push(`/playlists/${pl.id}`)
  } finally {
    creating.value = false
  }
}

async function remove(id: string, name: string) {
  if (!confirm(`Delete "${name}"?`)) return
  await playlists.deletePlaylist(id)
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-[28px] font-extrabold">Playlists</h1>
      <Button @click="showForm = !showForm">+ New playlist</Button>
    </div>

    <form v-if="showForm" class="flex items-center gap-2 mb-6" @submit.prevent="create">
      <Input v-model="newName" placeholder="Playlist name" autofocus required class="max-w-[280px]" />
      <Button type="submit" :disabled="creating">Create</Button>
      <Button type="button" variant="outline" @click="showForm = false">Cancel</Button>
    </form>

    <div v-if="playlists.loading" class="text-[13px] text-dimmed mt-4">Loading…</div>

    <div v-else-if="playlists.playlists.length === 0" class="text-[13px] text-dimmed mt-4">
      No playlists yet. Create one!
    </div>

    <div v-else class="flex flex-col gap-1">
      <div
        v-for="pl in playlists.playlists"
        :key="pl.id"
        class="flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors hover:bg-card group"
        @click="router.push(`/playlists/${pl.id}`)"
      >
        <div
          class="size-12 bg-muted rounded flex items-center justify-center text-[22px] shrink-0"
        >
          ♫
        </div>
        <div class="flex-1 flex flex-col gap-0.5 min-w-0">
          <span class="font-semibold text-[15px]">{{ pl.name }}</span>
          <span class="text-[13px] text-dimmed">
            {{ pl.trackCount }} track{{ pl.trackCount !== 1 ? 's' : '' }}
          </span>
        </div>
        <button
          class="size-8 rounded-full flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
          title="Delete"
          @click.stop="remove(pl.id, pl.name)"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>
