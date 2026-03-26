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
        'flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
