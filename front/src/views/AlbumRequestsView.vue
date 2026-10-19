<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RequestCard from '@/components/music/RequestCard.vue'
import { PageHeader, SectionHeader, StatePlate } from '@/components/vfd'
import { Send } from 'lucide-vue-next'
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

async function load() {
  loading.value = true
  try {
    requests.value = await listMyAlbumRequests()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load requests'))
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
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to send request'))
  } finally {
    submitting.value = false
  }
}

async function removeRequest(id: string) {
  try {
    await deleteAlbumRequest(id)
    requests.value = requests.value.filter((r) => r.id !== id)
    toast.success('Request deleted')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to delete request'))
    await load()
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-8">
    <PageHeader kicker="Source · Requests" title="Album Requests" />

    <form
      class="flex flex-col gap-[18px] rounded-lg border border-chrome-lo/40 bg-[linear-gradient(to_top,#0A0F12,#141B20)] p-6 shadow-[0_10px_24px_#000000cc]"
      @submit.prevent="submit"
    >
      <p class="text-sm text-soft">Missing something? Send it to the admins and it may land in the library.</p>
      <div class="flex flex-col gap-4 sm:flex-row">
        <div class="flex flex-1 flex-col gap-2">
          <Label for="album-name">Album name</Label>
          <Input id="album-name" v-model="albumName" required />
        </div>
        <div class="flex flex-1 flex-col gap-2">
          <Label for="artist-name">Artist name</Label>
          <Input id="artist-name" v-model="artistName" required />
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label for="album-url">Album URL</Label>
        <Input id="album-url" v-model="externalUrl" placeholder="https://open.spotify.com/..." required />
      </div>
      <div class="flex justify-end">
        <Button type="submit" :disabled="submitting">
          <template #icon><Send :size="13" aria-hidden="true" /></template>
          {{ submitting ? 'Sending…' : 'Send request' }}
        </Button>
      </div>
    </form>

    <section class="flex flex-col gap-3">
      <SectionHeader title="My Requests" :count="requests.length || undefined" class="mb-1" />
      <StatePlate v-if="loading" kind="loading" code="READING…" message="Loading…" />
      <StatePlate v-else-if="requests.length === 0" code="NO REQUESTS" message="No requests yet." />
      <template v-else>
        <RequestCard v-for="item in requests" :key="item.id" :request="item">
          <template #actions>
            <Button
              v-if="item.status === 'PENDING'"
              type="button"
              variant="destructive"
              size="sm"
              @click="removeRequest(item.id)"
            >Delete</Button>
          </template>
        </RequestCard>
      </template>
    </section>
  </div>
</template>
