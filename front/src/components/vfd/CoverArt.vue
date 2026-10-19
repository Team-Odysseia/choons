<script setup lang="ts">
import { ref, watch } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  src?: string | null
  alt: string
  size?: number
  round?: boolean
  class?: string
}

const props = defineProps<Props>()
const failed = ref(false)

watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div
    :class="cn('relative shrink-0 overflow-hidden border border-bezel-mid', round ? 'rounded-full' : 'rounded-[3px]', props.class)"
    :style="size ? { width: `${size}px`, height: `${size}px` } : undefined"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <div
      v-else
      data-placeholder
      role="img"
      :aria-label="alt"
      class="h-full w-full bg-[linear-gradient(200deg,#123B3A,#0A1114)]"
    />
  </div>
</template>
