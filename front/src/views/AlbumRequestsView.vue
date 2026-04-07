<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createAlbumRequest,
  deleteAlbumRequest,
  listMyAlbumRequests,
  type CreateAlbumRequestPayload,
} from '@/api/albumRequests'
import type { AlbumRequestResponse } from '@/api/types'

const albumName = ref('')
const artistName = ref('')
const externalUrl = ref('')
const loading = ref(false)
const submitting = ref(false)
const requests = ref<AlbumRequestResponse[]>([])

function statusClass(status: AlbumRequestResponse['status']) {
  if (status === 'ACCEPTED') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  if (status === 'REJECTED') return 'bg-red-500/10 text-red-300 border-red-500/30'
  return 'bg-amber-500/10 text-amber-300 border-amber-500/30'
}

async function load() {
  loading.value = true
  try {
    requests.value = await listMyAlbumRequests()
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to load requests')
  } finally {
    loading.value = false
  }
}

async function submit() {
  const payload: CreateAlbumRequestPayload = {
    albumName: albumName.value.trim(),
    artistName: artistName.value.trim(),
    externalUrl: externalUrl.value.trim(),
  }
  if (!payload.albumName || !payload.artistName || !payload.externalUrl) {
    toast.error('Fill all fields')
    return
  }

  submitting.value = true
  try {
    const created = await createAlbumRequest(payload)
    requests.value.unshift(created)
    albumName.value = ''
    artistName.value = ''
    externalUrl.value = ''
    toast.success('Request sent to admins')
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to send request')
  } finally {
    submitting.value = false
  }
}

async function removeRequest(id: string) {
  try {
    await deleteAlbumRequest(id)
    requests.value = requests.value.filter((r) => r.id !== id)
    toast.success('Request deleted')
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to delete request')
    await load()
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Album Requests</h1>

    <form class="request-form" @submit.prevent="submit">
      <div class="form-group">
        <Label for="album-name">Album name</Label>
        <Input id="album-name" v-model="albumName" required />
      </div>
      <div class="form-group">
        <Label for="artist-name">Artist name</Label>
        <Input id="artist-name" v-model="artistName" required />
      </div>
      <div class="form-group">
        <Label for="album-url">Album URL</Label>
        <Input
          id="album-url"
          v-model="externalUrl"
          placeholder="https://open.spotify.com/..."
          required
        />
      </div>
      <Button type="submit" :disabled="submitting">
        {{ submitting ? 'Sending…' : 'Send request' }}
      </Button>
    </form>

    <div class="mt-8">
      <h2 class="text-lg font-bold mb-3">My Requests</h2>
      <div v-if="loading" class="text-[13px] text-dimmed">Loading…</div>
      <div v-else-if="requests.length === 0" class="text-[13px] text-dimmed">No requests yet.</div>
      <div v-else class="flex flex-col gap-2">
        <div
          v-for="item in requests"
          :key="item.id"
          class="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col">
              <span class="font-semibold">{{ item.albumName }}</span>
              <span class="text-[13px] text-dimmed">{{ item.artistName }}</span>
            </div>
            <span class="status-pill" :class="statusClass(item.status)">{{ item.status }}</span>
          </div>
          <a
            :href="item.externalUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[13px] text-primary hover:underline break-all"
          >
            {{ item.externalUrl }}
          </a>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[12px] text-dimmed">{{ new Date(item.createdAt).toLocaleString() }}</span>
            <Button
              v-if="item.status === 'PENDING'"
              type="button"
              variant="destructive"
              size="sm"
              @click="removeRequest(item.id)"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.request-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-pill {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  border: 1px solid;
  border-radius: 999px;
  padding: 6px 8px;
}
</style>
