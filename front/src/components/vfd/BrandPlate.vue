<script setup lang="ts">
withDefaults(defineProps<{ size?: 'md' | 'lg' }>(), { size: 'md' })
</script>

<template>
  <div data-testid="brand-plate" class="chrome-plate flex flex-col gap-1 rounded px-3.5 py-3">
    <span
      :class="[
        'font-label leading-none tracking-[0.22em] [text-shadow:0_1px_0_#ffffff80]',
        size === 'lg' ? 'text-[26px]' : 'text-[22px]',
      ]"
    >CHOONS</span>
    <span class="flex items-center gap-2 font-label text-[7px] tracking-[0.2em] text-[#2B3339]" aria-hidden="true">
      VFD-1440<span class="h-px flex-1 bg-[#2B333966]" />DIGITAL AUDIO
    </span>
  </div>
</template>
