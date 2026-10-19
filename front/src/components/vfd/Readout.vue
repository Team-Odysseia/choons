<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  caption: string
  value: string
  tone?: 'cyan' | 'amber' | 'red' | 'dim'
  size?: 'sm' | 'md' | 'lg'
  seg?: boolean
  align?: 'start' | 'end'
}

const props = withDefaults(defineProps<Props>(), { tone: 'cyan', size: 'md', align: 'start' })

const toneClass = computed(
  () =>
    ({
      cyan: 'text-cyan glow-lg',
      amber: 'text-amber glow-amber',
      red: 'text-red glow-red',
      dim: 'text-faint',
    })[props.tone],
)

const sizeClass = computed(() => ({ sm: 'text-sm', md: 'text-[30px]', lg: 'text-[44px]' })[props.size])
</script>

<template>
  <div :class="cn('flex flex-col gap-1', align === 'end' ? 'items-end' : 'items-start')">
    <span class="font-label text-[8px] uppercase tracking-[0.2em] text-faint">{{ caption }}</span>
    <span
      data-value
      :class="cn('leading-none', seg ? 'font-seg' : 'font-display font-extrabold', sizeClass, toneClass)"
    >{{ value }}</span>
  </div>
</template>
