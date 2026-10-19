<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { usePlaylistsStore } from '@/stores/playlists'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BaseDialog from '@/components/ui/dialog/BaseDialog.vue'
import PlaylistRow from '@/components/music/PlaylistRow.vue'
import { Label } from '@/components/ui/label'
import { PageHeader, StatePlate } from '@/components/vfd'

const router = useRouter()
const playlists = usePlaylistsStore()

const newName = ref('')
const creating = ref(false)
const showForm = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)

onMounted(async () => {
  try {
    await playlists.fetchMyPlaylists()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load playlists'))
  }
})

async function create() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    const pl = await playlists.createPlaylist(newName.value.trim())
    newName.value = ''
    showForm.value = false
    router.push(`/playlists/${pl.id}`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to create playlist'))
  } finally {
    creating.value = false
  }
}

function askRemove(id: string, name: string) {
  deleteTarget.value = { id, name }
}

async function removeConfirmed() {
  const target = deleteTarget.value
  if (!target) return
  deleteTarget.value = null
  try {
    await playlists.deletePlaylist(target.id)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to delete playlist'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <div class="flex items-end justify-between gap-4">
      <PageHeader kicker="Source · Playlists" title="Playlists" />
      <Button @click="showForm = !showForm">+ New playlist</Button>
    </div>

    <form
      v-if="showForm"
      class="vfd-well flex flex-col gap-3 rounded-md border-cyan-dim! p-5 shadow-[inset_0_3px_10px_#000000ee,0_0_16px_#5CF6E826] sm:flex-row sm:items-end"
      @submit.prevent="create"
    >
      <div class="flex flex-1 flex-col gap-2">
        <Label for="new-playlist-name">Playlist name</Label>
        <Input id="new-playlist-name" v-model="newName" placeholder="Playlist name" autofocus required />
      </div>
      <div class="flex gap-2">
        <Button type="submit" :disabled="creating">Create</Button>
        <Button type="button" variant="ghost" @click="showForm = false">Cancel</Button>
      </div>
    </form>

    <StatePlate v-if="playlists.loading" kind="loading" code="READING…" message="Loading…" />
    <StatePlate v-else-if="playlists.playlists.length === 0" code="NO TAPES" message="No playlists yet. Create one!" />

    <div v-else class="flex flex-col gap-2">
      <PlaylistRow
        v-for="pl in playlists.playlists"
        :key="pl.id"
        :playlist="pl"
        deletable
        @delete="askRemove(pl.id, pl.name)"
      />
    </div>
  </div>

  <BaseDialog :open="!!deleteTarget" title="Delete playlist" tone="red" @close="deleteTarget = null">
    <div class="px-5 pb-5">
      <p class="mb-5 text-sm text-soft">
        Delete <span class="text-fg">{{ deleteTarget?.name }}</span>?
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="deleteTarget = null">Cancel</Button>
        <Button variant="destructive" @click="removeConfirmed">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>
