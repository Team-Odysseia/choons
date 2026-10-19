<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'vfd-key relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-label uppercase tracking-[0.18em] transition-[transform,box-shadow,color] duration-[90ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:pointer-events-none disabled:opacity-45 active:translate-y-px',
  {
    variants: {
      variant: {
        default: 'vfd-key--face border border-cyan-dim text-cyan glow-sm shadow-[0_3px_6px_#000000b3,0_0_14px_#5CF6E833] active:shadow-[inset_0_2px_6px_#000000e6]',
        outline: 'vfd-key--face border border-chrome-lo/40 text-soft shadow-[0_3px_6px_#000000b3] hover:text-fg active:shadow-[inset_0_2px_6px_#000000e6]',
        destructive: 'vfd-key--face border border-red/50 text-red glow-red shadow-[0_3px_6px_#000000b3] active:shadow-[inset_0_2px_6px_#000000e6]',
        ghost: 'border border-transparent text-soft hover:text-cyan',
        icon: 'vfd-key--face size-9 border border-chrome-lo/40 text-soft shadow-[0_3px_6px_#000000b3] hover:text-cyan',
      },
      size: {
        default: 'h-10 px-4 text-[11px]',
        sm: 'h-8 px-3 text-[9px]',
        lg: 'h-12 px-6 text-[13px]',
        icon: 'size-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

interface Props {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  led?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
  led: undefined,
})

const showLed = computed(() => {
  if (props.led !== undefined) return props.led
  return props.variant === 'default' || props.variant === 'outline' || props.variant === 'destructive'
})

const ledClass = computed(() => {
  if (props.disabled) return ''
  if (props.variant === 'default') return 'led-on'
  if (props.variant === 'destructive') return 'led-red'
  return ''
})

const classes = computed(() => {
  const base = cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)
  return props.disabled ? base.replace(/\bglow-(sm|red)\b/g, '') : base
})
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled">
    <span v-if="showLed" data-led aria-hidden="true" :class="['led', ledClass]" />
    <slot name="icon" />
    <slot />
  </button>
</template>

<style scoped>
.vfd-key--face {
  background: linear-gradient(to top, #0D1114, #2B3339);
}
</style>
