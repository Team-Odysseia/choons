<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/stores/auth'
import { apiStatus } from '@/lib/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandPlate } from '@/components/vfd'

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
  } catch (e) {
    toast.error(apiStatus(e) === 401 ? 'Invalid username or password' : 'Login failed. Please try again.')
  }
}
</script>

<template>
  <div class="login-page">
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
          alt=""
          draggable="false"
        />
      </div>
    </div>

    <div class="cover-overlay vfd-scanlines" aria-hidden="true" />

    <form class="power-unit" @submit.prevent="submit">
      <div class="flex items-center justify-between gap-4">
        <BrandPlate size="lg" class="w-60" />
        <span class="flex items-center gap-2 font-label text-[8px] tracking-[0.2em] text-faint" aria-hidden="true">
          POWER <span class="led led-on size-2!" />
        </span>
      </div>

      <div data-testid="power-display" class="vfd-well vfd-scanlines flex flex-col gap-1.5 rounded-md px-5 py-[18px]">
        <span aria-hidden="true" class="font-label text-[8px] tracking-[0.15em] text-amber glow-amber">SYSTEM CHECK OK · HI-FI · ST</span>
        <h1 class="font-display text-[46px] font-extrabold uppercase leading-none text-cyan glow-lg">Sign in</h1>
        <span data-testid="power-hint" aria-hidden="true" class="font-display text-[15px] font-bold text-cyan-dim">INSERT CREDENTIALS TO CONTINUE_</span>
      </div>

      <div class="flex flex-col gap-2">
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

      <div class="flex flex-col gap-2">
        <Label for="password">Password</Label>
        <Input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>

      <Button type="submit" size="lg" :disabled="auth.loading" class="w-full">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </Button>

      <span class="font-label text-[7px] uppercase tracking-[0.2em] text-faint">Made by Odysseia</span>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 16px;
  background: #020405;
}

.cover-bg {
  position: absolute;
  inset: -10%;
  display: flex;
  flex-direction: column;
  gap: 18px;
  opacity: 0.6;
}

.cover-row {
  display: flex;
  gap: 18px;
  flex-shrink: 0;
  animation: scroll-row 38s linear infinite;
}

@keyframes scroll-row {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-16.6667%);
  }
}

.cover-tile {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 3px;
  display: block;
  user-select: none;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 65% 65% at 50% 50%, #020405b3, #020405d9 55%, #020405);
}

.power-unit {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 28px;
  border-radius: 10px;
  border: 1px solid #dce3e855;
  background: linear-gradient(to bottom, #1a2126, #07090b);
  box-shadow: 0 30px 70px #000000, 0 0 40px #5cf6e826;
}

@media (prefers-reduced-motion: reduce) {
  .cover-row {
    animation: none;
  }
}
</style>
