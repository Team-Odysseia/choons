<script setup lang="ts">
import { computed, type Component } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  icon: Component
  label: string
  lit?: boolean
  size?: 28 | 32 | 36 | 40 | 52 | 60
  round?: boolean
  bare?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}

const props = withDefaults(defineProps<Props>(), { size: 36, type: 'button' })
const emit = defineEmits<{ click: [event: MouseEvent] }>()

const iconSize = computed(() => Math.round(props.size * (props.size >= 52 ? 0.42 : 0.45)))

const classes = computed(() =>
  cn(
    'relative inline-flex shrink-0 items-center justify-center transition-[transform,box-shadow,color] duration-[90ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:pointer-events-none disabled:opacity-40 active:translate-y-px',
    props.round ? 'rounded-full' : 'rounded',
    props.bare
      ? 'text-soft hover:text-cyan'
      : 'icon-key-face border shadow-[0_3px_6px_#000000b3] active:shadow-[inset_0_2px_6px_#000000e6]',
    !props.bare && (props.lit ? 'border-cyan-dim' : 'border-chrome-lo/40'),
    props.lit ? 'text-cyan glow-sm [&_svg]:drop-shadow-[0_0_6px_#5CF6E899]' : !props.bare && 'text-soft hover:text-fg',
  ),
)

function onClick(event: MouseEvent) {
  if (props.disabled) return
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    :class="classes"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @click="onClick"
  >
    <component :is="icon" :size="iconSize" :stroke-width="1.75" aria-hidden="true" />
  </button>
</template>

<style scoped>
.icon-key-face {
  background: linear-gradient(to top, #0D1114, #2B3339);
}
</style>
