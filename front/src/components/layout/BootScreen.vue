<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { prefersReducedMotion } from '@/lib/motion'

const FLAG = 'choons:booted'
const WORD = 'CHOONS'

type Phase = 'all-on' | 'off' | 'flicker' | 'type' | 'ready' | 'fade' | 'done'

const auth = useAuthStore()
const phase = ref<Phase>('done')
const typed = ref(0)
const timers: ReturnType<typeof setTimeout>[] = []

function alreadyBooted() {
  try {
    return sessionStorage.getItem(FLAG) === '1'
  } catch {
    return true
  }
}

function markBooted() {
  try {
    sessionStorage.setItem(FLAG, '1')
  } catch {
    return
  }
}

function at(ms: number, fn: () => void) {
  timers.push(setTimeout(fn, ms))
}

const text = computed(() => {
  if (phase.value === 'all-on' || phase.value === 'flicker') return '88:88 888'
  if (phase.value === 'type') return `${WORD.slice(0, typed.value)}_`
  if (phase.value === 'ready' || phase.value === 'fade') return 'READY'
  return ''
})

function start() {
  if (prefersReducedMotion.value || alreadyBooted()) return
  phase.value = 'all-on'
  at(140, () => (phase.value = 'off'))
  at(200, () => (phase.value = 'flicker'))
  at(280, () => (phase.value = 'type'))
  for (let i = 1; i <= WORD.length; i++) at(280 + i * 40, () => (typed.value = i))
  at(600, () => (phase.value = 'ready'))
  at(900, () => (phase.value = 'fade'))
  at(1100, () => {
    phase.value = 'done'
    markBooted()
  })
}

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) start()
  },
  { immediate: true },
)

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div
    v-if="phase !== 'done'"
    data-testid="boot-screen"
    aria-hidden="true"
    :class="[
      'boot vfd-scanlines fixed inset-0 z-[100] flex items-center justify-center bg-bg transition-opacity duration-200',
      phase === 'fade' && 'opacity-0',
    ]"
  >
    <div class="vfd-well flex h-28 w-[min(420px,calc(100%-2rem))] items-center justify-center rounded-lg">
      <span
        :class="[
          'font-display text-5xl font-extrabold text-cyan glow-lg',
          phase === 'off' && 'opacity-[0.08]',
          phase === 'flicker' && 'opacity-60',
        ]"
      >{{ phase === 'off' ? '88:88 888' : text }}</span>
    </div>
  </div>
</template>
