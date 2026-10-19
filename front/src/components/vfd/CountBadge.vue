<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<template>
  <span
    v-if="count > 0"
    class="inline-flex min-w-[18px] items-center justify-center rounded-full bg-amber px-1.5 py-px font-display text-[13px] font-black leading-tight text-[#1A1206] shadow-[0_0_8px_#FFB23F88]"
  >{{ count }}</span>
</template>
