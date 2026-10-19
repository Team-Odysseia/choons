<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { apiErrorMessage } from '@/lib/errors'
import { deleteListener, getListeners, registerListener, updateListener } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BaseDialog } from '@/components/ui/dialog'
import type { ListenerRequestBanResponse } from '@/api/types'
import AdminRow from '@/components/admin/AdminRow.vue'
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue'
import { StatePlate } from '@/components/vfd'

const username = ref('')
const password = ref('')
const loading = ref(false)
const listenersLoading = ref(false)
const listeners = ref<ListenerRequestBanResponse[]>([])
const search = ref('')
const activeQuery = ref('')
const addDialogOpen = ref(false)
const editTarget = ref<ListenerRequestBanResponse | null>(null)
const deleteTarget = ref<ListenerRequestBanResponse | null>(null)
const editUsername = ref('')
const editPassword = ref('')

const pageTitle = computed(() => `Listeners (${listeners.value.length})`)

onMounted(() => loadListeners())

async function loadListeners(query = activeQuery.value) {
  listenersLoading.value = true
  try {
    listeners.value = await getListeners(query.trim() || undefined)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to load listeners'))
  } finally {
    listenersLoading.value = false
  }
}

async function submit() {
  loading.value = true
  try {
    const created = await registerListener(username.value, password.value)
    username.value = ''
    password.value = ''
    toast.success(`Listener "${created.username}" created successfully`)
    addDialogOpen.value = false
    await loadListeners()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to create listener'))
  } finally {
    loading.value = false
  }
}

async function submitSearch() {
  activeQuery.value = search.value.trim()
  await loadListeners()
}

async function clearSearch() {
  search.value = ''
  activeQuery.value = ''
  await loadListeners('')
}

function openEdit(listener: ListenerRequestBanResponse) {
  editTarget.value = listener
  editUsername.value = listener.username
  editPassword.value = ''
}

async function saveEdit() {
  const target = editTarget.value
  if (!target) return

  try {
    const updated = await updateListener(target.id, editUsername.value.trim(), editPassword.value)
    listeners.value = listeners.value.map((l) => (l.id === updated.id ? updated : l))
    editTarget.value = null
    editPassword.value = ''
    toast.success(`Listener "${updated.username}" updated`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to update listener'))
  }
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return

  try {
    await deleteListener(target.id)
    listeners.value = listeners.value.filter((l) => l.id !== target.id)
    deleteTarget.value = null
    toast.success(`Listener "${target.username}" deleted`)
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Failed to delete listener'))
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminPageHeader
      kicker="Admin · Listeners"
      :title="pageTitle"
      :total="listeners.length"
      add-label="Add Listener"
      @add="addDialogOpen = true"
    />

    <form class="flex flex-wrap items-center gap-2.5 sm:flex-nowrap" @submit.prevent="submitSearch">
      <Input v-model="search" class="w-full sm:flex-1" placeholder="Search listener by username" />
      <Button type="submit" variant="outline">Search</Button>
      <Button type="button" variant="ghost" @click="clearSearch">Clear</Button>
    </form>

    <StatePlate v-if="listenersLoading" kind="loading" code="READING…" message="Loading listeners…" />
    <StatePlate v-else-if="listeners.length === 0" code="NO MATCH" message="No listeners found." />

    <div v-else class="flex flex-col gap-2">
      <AdminRow
        v-for="listener in listeners"
        :key="listener.id"
        :primary="listener.username"
        :secondary="listener.id"
        :blocked="listener.requestsBlocked"
        edit-label="Edit listener"
        delete-label="Delete listener"
        @edit="openEdit(listener)"
        @delete="deleteTarget = listener"
      />
    </div>
  </div>

  <BaseDialog :open="addDialogOpen" title="Add Listener" @close="addDialogOpen = false">
    <form class="flex flex-col gap-4 px-5 pb-5" @submit.prevent="submit">
      <div class="flex flex-col gap-2">
        <Label for="username">Username</Label>
        <Input id="username" v-model="username" required />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="password">Password</Label>
        <Input id="password" v-model="password" type="password" required />
      </div>
      <div class="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" @click="addDialogOpen = false">Cancel</Button>
        <Button type="submit" :disabled="loading">{{ loading ? 'Creating…' : 'Create listener' }}</Button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!editTarget" title="Edit Listener" @close="editTarget = null">
    <form class="flex flex-col gap-4 px-5 pb-5" @submit.prevent="saveEdit">
      <div class="flex flex-col gap-2">
        <Label for="edit-username">Username</Label>
        <Input id="edit-username" v-model="editUsername" required />
      </div>
      <div class="flex flex-col gap-2">
        <Label for="edit-password">New password (optional)</Label>
        <Input id="edit-password" v-model="editPassword" type="password" placeholder="Leave blank to keep current" />
      </div>
      <div class="mt-1 flex justify-end gap-2">
        <Button type="button" variant="ghost" @click="editTarget = null">Cancel</Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!deleteTarget" title="Delete Listener" tone="red" @close="deleteTarget = null">
    <div class="px-5 pb-5">
      <p class="mb-5 text-sm text-soft">
        Delete <span class="text-fg">{{ deleteTarget?.username }}</span>?
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="deleteTarget = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>
