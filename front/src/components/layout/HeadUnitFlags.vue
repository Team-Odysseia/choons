<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ hifi: boolean; shuffle: boolean; repeat: boolean; party: boolean; hasTrack: boolean }>()

const flags = computed(() => [
  { name: 'CD', on: props.hasTrack, amber: false },
  { name: 'ST', on: props.hasTrack, amber: false },
  { name: 'HI-FI', on: props.hifi, amber: true },
  { name: 'SHF', on: props.shuffle, amber: false },
  { name: 'RPT', on: props.repeat, amber: false },
  { name: 'PARTY', on: props.party, amber: true },
])
</script>

<template>
  <div class="flex items-center gap-2.5 font-label text-[8px] tracking-[0.15em]" aria-hidden="true">
    <span
      v-for="flag in flags"
      :key="flag.name"
      :data-flag="flag.name"
      :data-on="flag.on ? '' : undefined"
      :class="
        flag.on
          ? flag.amber
            ? 'text-amber [text-shadow:0_0_5px_#FFB23F88]'
            : 'text-cyan [text-shadow:0_0_5px_#5CF6E899]'
          : flag.amber
            ? 'text-amber-ghost'
            : 'text-cyan-ghost'
      "
    >{{ flag.name }}</span>
  </div>
</template>
