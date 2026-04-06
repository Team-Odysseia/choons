<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import {
  listAllAlbumRequests,
  setUserRequestBan,
  updateAlbumRequestStatus,
} from '@/api/albumRequests'
import type { AlbumRequestResponse } from '@/api/types'

const loading = ref(false)
const requests = ref<AlbumRequestResponse[]>([])

function statusClass(status: AlbumRequestResponse['status']) {
  if (status === 'ACCEPTED') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  if (status === 'REJECTED') return 'bg-red-500/10 text-red-300 border-red-500/30'
  return 'bg-amber-500/10 text-amber-300 border-amber-500/30'
}

async function load() {
  loading.value = true
  try {
    requests.value = await listAllAlbumRequests()
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to load requests')
  } finally {
    loading.value = false
  }
}

async function changeStatus(id: string, status: 'ACCEPTED' | 'REJECTED') {
  try {
    const updated = await updateAlbumRequestStatus(id, status)
    const idx = requests.value.findIndex((r) => r.id === id)
    if (idx !== -1) requests.value[idx] = updated
    toast.success(`Request ${status.toLowerCase()}`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update status')
  }
}

async function toggleBlock(item: AlbumRequestResponse) {
  const targetBlocked = !item.requesterRequestsBlocked
  try {
    const updated = await setUserRequestBan(item.requesterId, targetBlocked)
    requests.value = requests.value.map((req) =>
      req.requesterId === updated.id
        ? { ...req, requesterRequestsBlocked: updated.requestsBlocked }
        : req,
    )
    toast.success(updated.requestsBlocked ? 'Requester blocked' : 'Requester unblocked')
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update requester block')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Album Requests</h1>

    <div v-if="loading" class="text-[13px] text-dimmed">Loading…</div>
    <div v-else-if="requests.length === 0" class="text-[13px] text-dimmed">No incoming requests.</div>

    <div v-else class="flex flex-col gap-2">
      <div
        v-for="item in requests"
        :key="item.id"
        class="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <span class="font-semibold">{{ item.albumName }} · {{ item.artistName }}</span>
            <span class="text-[13px] text-dimmed">Requested by {{ item.requesterUsername }}</span>
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

        <div class="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            @click="changeStatus(item.id, 'ACCEPTED')"
          >
            Accept
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            @click="changeStatus(item.id, 'REJECTED')"
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="toggleBlock(item)"
          >
            {{ item.requesterRequestsBlocked ? 'Unblock requester' : 'Block requester' }}
          </Button>
          <span
            v-if="item.requesterRequestsBlocked"
            class="text-[11px] font-semibold text-red-300 border border-red-500/30 rounded-full px-2 py-1"
          >
            Blocked
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-pill {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  border: 1px solid;
  border-radius: 999px;
  padding: 6px 8px;
}
</style>
