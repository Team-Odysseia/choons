<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  code: string
  message: string
  kind?: 'empty' | 'loading' | 'error'
}

const props = withDefaults(defineProps<Props>(), { kind: 'empty' })

const codeClass = computed(() =>
  cn(
    'font-display text-[34px] font-extrabold leading-none',
    props.kind === 'error' ? 'text-red glow-red' : 'text-cyan glow-lg',
    props.kind === 'loading' && 'vfd-blink',
  ),
)
</script>

<template>
  <div
    :role="kind === 'loading' ? 'status' : undefined"
    :class="
      cn(
        'vfd-well vfd-scanlines flex flex-col items-center gap-2.5 rounded-md px-7 py-9 text-center',
        kind === 'error' && 'border-red-ghost',
      )
    "
  >
    <span data-code aria-hidden="true" :class="codeClass">{{ code }}</span>
    <p class="text-sm leading-relaxed text-soft">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.vfd-blink {
  animation: vfd-blink 1.1s steps(1) infinite;
}

@keyframes vfd-blink {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vfd-blink {
    animation: none;
  }
}
</style>
