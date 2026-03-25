<script setup lang="ts">
import { ref } from 'vue'
import { registerListener } from '@/api/auth'
import type { UserResponse } from '@/api/types'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const created = ref<UserResponse | null>(null)

async function submit() {
  error.value = ''
  created.value = null
  loading.value = true
  try {
    created.value = await registerListener(username.value, password.value)
    username.value = ''
    password.value = ''
  } catch (e: any) {
    error.value = e.response?.data?.error ?? 'Failed to create listener'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="page-title">Register Listener</h1>

    <form class="admin-form" @submit.prevent="submit">
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" v-model="username" class="form-input" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" v-model="password" class="form-input" type="password" required />
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <div v-if="created" class="success-msg">
        Listener <strong>{{ created.username }}</strong> created successfully.
      </div>

      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Creating…' : 'Create listener' }}
      </button>
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

.success-msg {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--accent);
}
</style>
