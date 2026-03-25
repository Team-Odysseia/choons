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
        'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </label>
</template>
