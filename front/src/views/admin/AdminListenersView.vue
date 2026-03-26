<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { registerListener } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const username = ref('')
const password = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    const created = await registerListener(username.value, password.value)
    username.value = ''
    password.value = ''
    toast.success(`Listener "${created.username}" created successfully`)
  } catch (e: any) {
    toast.error(e.response?.data?.error ?? 'Failed to create listener')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[28px] font-extrabold mb-6">Register Listener</h1>

    <form class="admin-form" @submit.prevent="submit">
      <div class="form-group">
        <Label for="username">Username</Label>
        <Input id="username" v-model="username" required />
      </div>
      <div class="form-group">
        <Label for="password">Password</Label>
        <Input id="password" v-model="password" type="password" required />
      </div>
      <Button type="submit" :disabled="loading">
        {{ loading ? 'Creating…' : 'Create listener' }}
      </Button>
    </form>
  </div>
</template>

<style scoped>
.admin-form {
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
