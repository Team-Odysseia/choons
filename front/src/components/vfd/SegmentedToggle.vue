<script setup lang="ts">
import type { Component } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'

interface Option {
  value: string
  label: string
  icon?: Component
}

defineProps<{ modelValue: string; options: Option[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onUpdate(value: unknown) {
  if (typeof value === 'string' && value) emit('update:modelValue', value)
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="modelValue"
    class="inline-flex gap-[3px] rounded-[5px] border border-line bg-glass p-[3px] shadow-[inset_0_2px_6px_#000000cc]"
    @update:model-value="onUpdate"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      class="inline-flex items-center gap-1.5 rounded-[3px] px-3 py-[7px] font-label text-[10px] uppercase tracking-[0.15em] text-faint transition-colors data-[state=on]:bg-[linear-gradient(to_top,#0D1114,#2B3339)] data-[state=on]:text-cyan data-[state=on]:glow-sm"
    >
      <component :is="option.icon" v-if="option.icon" :size="13" aria-hidden="true" />
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
