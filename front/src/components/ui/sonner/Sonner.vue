<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <Toaster
    position="top-right"
    theme="dark"
    rich-colors
    :toast-options="{
      style: {
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
      },
    }"
  />
</template>
