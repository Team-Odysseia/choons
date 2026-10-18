<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const baseIds = ref<string[]>([])

const apiUrl = import.meta.env.VITE_API_URL as string

const COVERS_PER_ROW = 6
const NUM_ROWS = 20
const REPS = 6 // repeat each row 6× → animate -16.667% for seamless loop

// Each row gets a slice of the cover pool, repeated REPS times for a seamless loop.
// Rows alternate scroll direction (left / right).
const rows = computed(() => {
  if (baseIds.value.length === 0) return []
  return Array.from({ length: NUM_ROWS }, (_, rowIdx) => {
    const slice = Array.from({ length: COVERS_PER_ROW }, (_, j) =>
      baseIds.value[(rowIdx * COVERS_PER_ROW + j) % baseIds.value.length],
    )
    return Array.from({ length: REPS }, () => slice).flat()
  })
})

onMounted(async () => {
  try {
    const res = await fetch(`${apiUrl}/public/covers`)
    if (res.ok) baseIds.value = await res.json()
  } catch {
    // Background is purely cosmetic — ignore errors
  }
})

async function submit() {
  try {
    await auth.login(username.value, password.value)
    router.push('/library')
  } catch (e: any) {
    toast.error(
      e.response?.status === 401 ? 'Invalid username or password' : 'Login failed. Please try again.',
    )
    console.log('Login error:', e)
  }
}
</script>

<template>
  <div class="login-page">

    <!-- Animated cover background -->
    <div v-if="rows.length > 0" class="cover-bg" aria-hidden="true">
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="cover-row"
        :style="{
          animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
          animationDuration: `${38 + i * 4}s`,
        }"
      >
        <img
          v-for="(id, j) in row"
          :key="j"
          :src="`${apiUrl}/media/images/albums/${id}`"
          class="cover-tile"
          draggable="false"
        />
      </div>
    </div>

    <!-- Dark overlay -->
    <div class="cover-overlay" />

    <!-- Login card -->
    <form class="login-card" @submit.prevent="submit">
      <div class="text-[28px] font-black text-primary text-center tracking-tight">choons</div>
      <h1 class="text-[22px] font-extrabold text-center">Sign in</h1>

      <div class="flex flex-col gap-1.5">
        <Label for="username">Username</Label>
        <Input
          id="username"
          v-model="username"
          type="text"
          autocomplete="username"
          required
          autofocus
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <Button type="submit" :disabled="auth.loading" class="w-full justify-center">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </Button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--background);
}

/* inset: -50% so rotated corners always stay covered */
.cover-bg {
  position: absolute;
  inset: -50%;
  transform: rotate(-12deg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cover-row {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  /* -16.667% = exactly one copy (1 of 6), seamless loop */
  animation: scroll-row 38s linear infinite;
}

@keyframes scroll-row {
  from { transform: translateX(0); }
  to   { transform: translateX(-16.6667%); }
}

.cover-tile {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 4px;
  display: block;
  user-select: none;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
}

.login-card {
  position: relative;
  z-index: 10;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 40px 36px;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
