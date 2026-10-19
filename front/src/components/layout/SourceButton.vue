<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { CountBadge, Marquee } from '@/components/vfd'
import { cn } from '@/lib/utils'

const props = defineProps<{
  to?: RouteLocationRaw
  icon: Component
  label: string
  active: boolean
  count?: number
}>()
defineEmits<{ click: [] }>()

const classes = computed(() =>
  cn(
    'flex w-full items-center gap-3 rounded border px-3.5 py-[11px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan',
    props.active
      ? 'border-transparent bg-[linear-gradient(to_top,#0D1114,#2B3339)] text-cyan shadow-[0_3px_6px_#000000b3] [border-left-color:#2BA89E]'
      : 'border-transparent text-soft hover:bg-panel-2 hover:text-fg',
  ),
)
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    :class="classes"
    :data-active="active ? '' : undefined"
    :aria-current="active ? 'page' : undefined"
    @click="$emit('click')"
  >
    <span aria-hidden="true" :class="['led', active && 'led-on']" />
    <component
      :is="icon"
      :size="16"
      aria-hidden="true"
      :class="active ? 'drop-shadow-[0_0_6px_#5CF6E899]' : ''"
    />
    <Marquee
      :text="label"
      mode="bounce"
      :class="['min-w-0 flex-1 font-label text-[10px] uppercase tracking-[0.2em]', active && 'glow-sm']"
    />
    <CountBadge v-if="count" :count="count" />
  </component>
</template>
