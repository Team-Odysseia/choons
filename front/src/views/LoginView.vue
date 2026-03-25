<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    await auth.login(username.value, password.value)
    router.push('/library')
  } catch (e: any) {
    error.value = e.response?.status === 401
      ? 'Invalid username or password'
      : 'Login failed. Please try again.'
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-logo">choons</div>
      <h1 class="login-title">Sign in</h1>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          class="form-input"
          type="text"
          autocomplete="username"
          required
          autofocus
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="form-input"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>

      <button type="submit" class="btn btn-primary" :disabled="auth.loading" style="width: 100%; justify-content: center;">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
}

.login-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px 36px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-logo {
  font-size: 28px;
  font-weight: 900;
  color: var(--accent);
  text-align: center;
  letter-spacing: -1px;
}

.login-title {
  font-size: 22px;
  font-weight: 800;
  text-align: center;
}
</style>
