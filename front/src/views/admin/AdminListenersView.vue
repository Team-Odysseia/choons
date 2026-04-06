<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { deleteListener, getListeners, registerListener, updateListener } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BaseDialog } from '@/components/ui/dialog'
import type { ListenerRequestBanResponse } from '@/api/types'
import { Pencil, Trash2 } from 'lucide-vue-next'

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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to load listeners')
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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to create listener')
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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to update listener')
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
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to delete listener')
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3 mb-6">
      <h1 class="text-[28px] font-extrabold">{{ pageTitle }}</h1>
      <Button @click="addDialogOpen = true">Add Listener</Button>
    </div>

    <form class="search-row" @submit.prevent="submitSearch">
      <Input v-model="search" placeholder="Search listener by username" />
      <Button type="submit" variant="outline">Search</Button>
      <Button type="button" variant="ghost" @click="clearSearch">Clear</Button>
    </form>

    <div v-if="listenersLoading" class="text-[13px] text-dimmed mt-6">Loading listeners…</div>
    <div v-else-if="listeners.length === 0" class="text-[13px] text-dimmed mt-6">No listeners found.</div>

    <div v-else class="list mt-4">
      <div v-for="listener in listeners" :key="listener.id" class="list-item">
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0 flex flex-col gap-1">
            <span class="font-semibold truncate">{{ listener.username }}</span>
            <span class="text-[12px] text-dimmed">{{ listener.id }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span
              v-if="listener.requestsBlocked"
              class="text-[11px] font-semibold text-red-300 border border-red-500/30 rounded-full px-2 py-1"
            >Blocked</span>
            <button
              class="size-8 rounded-full flex items-center justify-center text-dimmed hover:text-foreground hover:bg-muted transition-colors"
              @click="openEdit(listener)"
            >
              <Pencil :size="14" />
            </button>
            <button
              class="size-8 rounded-full flex items-center justify-center text-dimmed hover:text-destructive hover:bg-muted transition-colors"
              @click="deleteTarget = listener"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <BaseDialog :open="addDialogOpen" title="Add Listener" @close="addDialogOpen = false">
    <form class="dialog-form" @submit.prevent="submit">
      <div class="form-group">
        <Label for="username">Username</Label>
        <Input id="username" v-model="username" required />
      </div>
      <div class="form-group">
        <Label for="password">Password</Label>
        <Input id="password" v-model="password" type="password" required />
      </div>
      <div class="flex justify-end gap-2 mt-1">
        <Button type="button" variant="outline" @click="addDialogOpen = false">Cancel</Button>
        <Button type="submit" :disabled="loading">{{ loading ? 'Creating…' : 'Create listener' }}</Button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!editTarget" title="Edit Listener" @close="editTarget = null">
    <form class="dialog-form" @submit.prevent="saveEdit">
      <div class="form-group">
        <Label for="edit-username">Username</Label>
        <Input id="edit-username" v-model="editUsername" required />
      </div>
      <div class="form-group">
        <Label for="edit-password">New password (optional)</Label>
        <Input id="edit-password" v-model="editPassword" type="password" />
      </div>
      <div class="flex justify-end gap-2 mt-1">
        <Button type="button" variant="outline" @click="editTarget = null">Cancel</Button>
        <Button type="submit">Save changes</Button>
      </div>
    </form>
  </BaseDialog>

  <BaseDialog :open="!!deleteTarget" title="Delete Listener" @close="deleteTarget = null">
    <div class="px-5 pb-5">
      <p class="text-sm text-muted-foreground mb-5">
        Delete <span class="font-semibold text-foreground">{{ deleteTarget?.username }}</span>?
      </p>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="deleteTarget = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDelete">Delete</Button>
      </div>
    </div>
  </BaseDialog>
</template>

<style scoped>
.search-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  padding: 12px 14px;
}

.dialog-form {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 640px) {
  .search-row {
    flex-wrap: wrap;
  }

  .search-row > :first-child {
    width: 100%;
  }
}
</style>
