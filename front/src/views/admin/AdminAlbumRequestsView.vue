<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import RequestCard from '@/components/music/RequestCard.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { Readout, StatePlate, VfdBadge } from '@/components/vfd'
import {
  listAllAlbumRequests,
  setUserRequestBan,
  updateAlbumRequestStatus,
} from '@/api/albumRequests'
import type { AlbumRequestResponse } from '@/api/types'

const loading = ref(false)
const requests = ref<AlbumRequestResponse[]>([])
const pendingCount = computed(() => requests.value.filter((r) => r.status === 'PENDING').length)

async function load() {
  loading.value = true
  try {
    requests.value = await listAllAlbumRequests()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load requests'))
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
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to update status'))
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
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to update requester block'))
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader kicker="Admin · Requests" title="Album Requests">
      <Readout
        data-testid="pending-readout"
        caption="Pending"
        :value="String(pendingCount).padStart(3, '0')"
        tone="amber"
        align="end"
      />
    </AdminPageHeader>

    <StatePlate v-if="loading" kind="loading" code="READING…" message="Loading…" />
    <StatePlate v-else-if="requests.length === 0" code="ALL CLEAR" message="No incoming requests." />

    <div v-else class="flex flex-col gap-2">
      <RequestCard v-for="item in requests" :key="item.id" :request="item" :requester="item.requesterUsername">
        <template #actions>
          <VfdBadge v-if="item.requesterRequestsBlocked" data-testid="blocked-badge" tone="red" label="Blocked" />
          <Button type="button" size="sm" @click="changeStatus(item.id, 'ACCEPTED')">Accept</Button>
          <Button type="button" size="sm" variant="destructive" @click="changeStatus(item.id, 'REJECTED')">Reject</Button>
          <Button type="button" size="sm" variant="outline" @click="toggleBlock(item)">
            {{ item.requesterRequestsBlocked ? 'Unblock requester' : 'Block requester' }}
          </Button>
        </template>
      </RequestCard>
    </div>
  </div>
</template>
