<script setup lang="ts">
import type { HTMLAttributes, InputHTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
  type?: InputHTMLAttributes['type']
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

const modelValue = defineModel<string | number>()
</script>

<template>
  <input
    v-bind="$attrs"
    :type="type"
    v-model="modelValue"
    :class="
      cn(
        'vfd-input flex h-[42px] w-full rounded border border-line bg-glass px-3.5 font-body text-[15px] text-fg shadow-[inset_0_2px_6px_#000000cc] outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-cyan-dim focus:shadow-[inset_0_2px_6px_#000000cc,0_0_12px_#5CF6E833] disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>

<style scoped>
.vfd-input {
  caret-color: #5CF6E8;
  caret-shape: block;
}
</style>
