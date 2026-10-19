<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  for?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <label
    :for="props.for"
    :class="
      cn(
        'font-label text-[10px] uppercase tracking-[0.2em] text-soft transition-colors',
        props.class,
      )
    "
  >
    <slot />
  </label>
</template>

<style scoped>
label:has(+ input:focus),
label:has(+ select:focus),
label:has(+ textarea:focus),
label:has(+ * :focus) {
  color: #5CF6E8;
}
</style>
