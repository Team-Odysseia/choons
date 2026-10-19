<script setup lang="ts">
import { GripVertical, X } from 'lucide-vue-next'
import { IconKey } from '@/components/vfd'
import { formatDuration } from '@/lib/format'

defineProps<{
  title: string
  sub: string
  duration: number
  current?: boolean
  canRemove?: boolean
  locked?: boolean
}>()
defineEmits<{ remove: [] }>()
</script>

<template>
  <div
    :data-current="current ? '' : undefined"
    :class="[
      'group flex items-center gap-2.5 rounded px-2.5 py-2 transition-colors',
      current ? 'bg-cyan-wash' : 'hover:bg-panel-2',
    ]"
  >
    <GripVertical
      :size="14"
      aria-hidden="true"
      :class="['drag-handle shrink-0 text-faint', locked ? 'cursor-not-allowed opacity-30' : 'cursor-grab active:cursor-grabbing']"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span :class="['truncate text-sm', current ? 'text-cyan glow-sm' : 'text-fg']">{{ title }}</span>
      <span class="truncate text-xs text-soft">{{ sub }}</span>
    </div>
    <span class="shrink-0 font-display text-[13px] font-bold text-soft">{{ formatDuration(duration) }}</span>
    <IconKey
      v-if="canRemove"
      bare
      :icon="X"
      label="Remove"
      :size="24"
      class="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      @click="$emit('remove')"
    />
  </div>
</template>
