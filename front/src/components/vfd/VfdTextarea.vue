<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const modelValue = defineModel<string>()
</script>

<template>
  <textarea
    v-model="modelValue"
    :class="
      cn(
        'vfd-field min-h-[104px] w-full resize-y rounded border border-line bg-glass px-3.5 py-3 font-body text-[15px] leading-[1.4] text-fg shadow-[inset_0_2px_6px_#000000cc] outline-none placeholder:text-faint focus:border-cyan-dim focus:shadow-[inset_0_2px_6px_#000000cc,0_0_12px_#5CF6E833] disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
