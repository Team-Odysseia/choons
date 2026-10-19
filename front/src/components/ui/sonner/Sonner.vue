<script setup lang="ts">
import { Toaster } from 'vue-sonner'

const toastOptions = {
  unstyled: true,
  classes: {
    toast:
      'vfd-toast vfd-well flex w-[340px] items-start gap-3 rounded-md border px-4 py-3.5 font-body shadow-[0_10px_24px_#000000cc]',
    title: 'font-display text-base font-extrabold uppercase leading-tight',
    description: 'mt-1 text-[13px] text-soft',
    icon: 'hidden',
    default: 'vfd-toast--cyan border-cyan-dim text-cyan',
    success: 'vfd-toast--cyan border-cyan-dim text-cyan',
    info: 'vfd-toast--amber border-amber text-amber',
    warning: 'vfd-toast--amber border-amber text-amber',
    error: 'vfd-toast--red border-red text-red',
    loading: 'vfd-toast--cyan border-cyan-dim text-cyan',
    actionButton: 'font-label text-[9px] uppercase tracking-[0.15em] text-cyan',
    cancelButton: 'font-label text-[9px] uppercase tracking-[0.15em] text-soft',
  },
}
</script>

<template>
  <Toaster position="top-right" theme="dark" :toast-options="toastOptions" />
</template>

<style>
.vfd-toast::before {
  content: '';
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 9999px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.vfd-toast--cyan [data-title] {
  text-shadow: 0 0 8px #5cf6e899;
}

.vfd-toast--amber [data-title] {
  text-shadow: 0 0 8px #ffb23f88;
}

.vfd-toast--red [data-title] {
  text-shadow: 0 0 8px #ff4a4a88;
}
</style>
