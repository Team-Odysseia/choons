<script setup lang="ts">
defineProps<{ kicker: string; title: string }>()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <span class="font-label text-[9px] uppercase tracking-[0.3em] text-faint">{{ kicker }}</span>
    <h1 class="truncate font-display text-[40px] font-extrabold uppercase leading-none text-cyan glow-lg md:text-[52px]">{{ title }}</h1>
  </div>
</template>
