<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'amber' | 'cyan' | 'red' | 'mute'

interface Props {
  tone: Tone
  label: string
  led?: boolean
}

const props = withDefaults(defineProps<Props>(), { led: true })

const toneClasses: Record<Tone, string> = {
  amber: 'text-amber border-amber bg-amber-ghost',
  cyan: 'text-cyan border-cyan bg-cyan-wash',
  red: 'text-red border-red bg-red-ghost',
  mute: 'text-faint border-faint bg-transparent',
}

const ledClasses: Record<Tone, string> = {
  amber: 'led-amber',
  cyan: 'led-on',
  red: 'led-red',
  mute: '',
}

const classes = computed(() => toneClasses[props.tone])
</script>

<template>
  <span
    :class="[
      'inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-[3px] font-label text-[9px] uppercase leading-none tracking-[0.16em]',
      classes,
    ]"
  >
    <span v-if="led" data-led aria-hidden="true" :class="['led size-[5px]!', ledClasses[tone]]" />{{ label }}
  </span>
</template>
