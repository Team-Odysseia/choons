<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { getArtists, createArtist } from '@/api/artists'
import type { ArtistResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const artists = ref<ArtistResponse[]>([])
const name = ref('')
const bio = ref('')
const loading = ref(false)

onMounted(load)

async function load() {
  artists.value = await getArtists()
}

async function submit() {
  loading.value = true
  try {
    const created = await createArtist(name.value, bio.value)
    artists.value.unshift(created)
    name.value = ''
    bio.value = ''
    toast.success(`Artist "${created.name}" created successfully`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to create artist')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Artists</h1>

    <form class="admin-form" @submit.prevent="submit">
      <h2 class="text-lg font-bold mb-4">Add Artist</h2>
      <div class="form-group">
        <Label>Name</Label>
        <Input v-model="name" required />
      </div>
      <div class="form-group">
        <Label>Bio</Label>
        <textarea
          v-model="bio"
          class="flex w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary resize-y"
          rows="3"
        />
      </div>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Adding…' : 'Add artist' }}
      </Button>
    </form>

    <div class="list-section">
      <h2 class="text-lg font-bold mb-4">All Artists</h2>
      <div v-if="artists.length === 0" class="text-[13px] text-dimmed">No artists yet.</div>
      <div v-else class="item-list">
        <div v-for="a in artists" :key="a.id" class="list-item">
          <span class="item-name">{{ a.name }}</span>
          <span class="text-[13px] text-dimmed">{{ a.bio?.slice(0, 60) }}{{ (a.bio?.length ?? 0) > 60 ? '…' : '' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-form {
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.list-section { margin-top: 8px; }
.item-list { display: flex; flex-direction: column; gap: 4px; }
.list-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 16px;
  background: var(--card);
  border-radius: 4px;
}
.item-name { font-weight: 600; }
</style>
