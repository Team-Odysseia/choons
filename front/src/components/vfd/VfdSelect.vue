<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const modelValue = defineModel<string | number>()
</script>

<template>
  <div :class="cn('relative w-full', props.class)">
    <select
      v-bind="$attrs"
      v-model="modelValue"
      class="vfd-field h-[42px] w-full appearance-none rounded border border-line bg-glass pl-3.5 pr-10 font-body text-[15px] text-fg outline-none transition-[border-color,box-shadow] focus:border-cyan-dim focus:shadow-[inset_0_2px_6px_#000000cc,0_0_12px_#5CF6E833] disabled:opacity-50"
    >
      <slot />
    </select>
    <ChevronDown
      :size="16"
      aria-hidden="true"
      class="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-dim"
    />
  </div>
</template>
