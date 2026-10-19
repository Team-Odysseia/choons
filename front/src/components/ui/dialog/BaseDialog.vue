<script setup lang="ts">
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogDescription } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { IconKey } from '@/components/vfd'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{ open: boolean; title: string; maxWidthClass?: string; tone?: 'cyan' | 'red' }>(), {
  maxWidthClass: 'max-w-md',
  tone: 'cyan',
})
const emit = defineEmits<{ close: [] }>()

function onOpenChange(value: boolean) {
  if (!value) emit('close')
}
</script>

<template>
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay class="vfd-dialog-overlay fixed inset-0 z-50 bg-black/65 backdrop-blur-[6px]" />
      <DialogContent
        :aria-describedby="undefined"
        :class="
          cn(
            'vfd-dialog fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-chrome-lo/50 bg-[linear-gradient(to_top,#0A0F12,#161E23)] shadow-[0_24px_60px_#000000f0,0_0_30px_#5CF6E81F] focus:outline-none',
            maxWidthClass,
          )
        "
      >
        <div class="flex shrink-0 items-center gap-3 border-b border-line py-4 pl-5 pr-4">
          <span aria-hidden="true" :class="['led size-[7px]!', tone === 'red' ? 'led-red' : 'led-on']" />
          <DialogTitle
            :class="[
              'min-w-0 flex-1 truncate font-display text-[22px] font-extrabold uppercase leading-none',
              tone === 'red' ? 'text-red glow-red' : 'text-cyan glow-sm',
            ]"
          >{{ title }}</DialogTitle>
          <IconKey :icon="X" label="Close dialog" :size="30" @click="emit('close')" />
        </div>
        <DialogDescription class="sr-only">{{ title }}</DialogDescription>
        <div class="min-h-0 overflow-y-auto pt-4">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.vfd-dialog[data-state='open'] {
  animation: vfd-dialog-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.vfd-dialog-overlay[data-state='open'] {
  animation: vfd-fade-in 180ms ease-out;
}

@keyframes vfd-dialog-in {
  from {
    opacity: 0;
    scale: 0.96;
  }
  to {
    opacity: 1;
    scale: 1;
  }
}

@keyframes vfd-fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vfd-dialog[data-state='open'],
  .vfd-dialog-overlay[data-state='open'] {
    animation: none;
  }
}
</style>
