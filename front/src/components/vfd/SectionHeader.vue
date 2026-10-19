<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import IconKey from './IconKey.vue'

interface Props {
  title: string
  count?: number
  seeAll?: boolean
  seeAllLabel?: string
  arrows?: boolean
  expanded?: boolean
  prevDisabled?: boolean
  nextDisabled?: boolean
}

withDefaults(defineProps<Props>(), { seeAllLabel: 'See all' })
defineEmits<{ 'see-all': []; prev: []; next: [] }>()
</script>

<template>
  <div class="flex items-center justify-between gap-4 border-b border-line pb-2.5">
    <div class="flex min-w-0 items-end gap-3">
      <h2 class="truncate font-display text-[26px] font-extrabold uppercase leading-none text-cyan glow-sm">{{ title }}</h2>
      <span v-if="count !== undefined" class="font-display text-base font-bold text-faint">{{ count }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
      <Button v-if="seeAll" variant="ghost" size="sm" @click="$emit('see-all')">{{ expanded ? 'Show less' : seeAllLabel }}</Button>
      <template v-if="arrows">
        <IconKey :icon="ChevronLeft" label="Previous" :size="32" :disabled="prevDisabled" @click="$emit('prev')" />
        <IconKey :icon="ChevronRight" label="Next" :size="32" :disabled="nextDisabled" @click="$emit('next')" />
      </template>
    </div>
  </div>
</template>
