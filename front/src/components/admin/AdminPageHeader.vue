<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { PageHeader, Readout } from '@/components/vfd'

defineProps<{ kicker: string; title: string; total?: number; addLabel?: string }>()
defineEmits<{ add: [] }>()
</script>

<template>
  <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
    <PageHeader :kicker="kicker" :title="title" class="flex-1" />
    <div class="flex items-end gap-6">
      <Readout
        v-if="total !== undefined"
        data-testid="total-readout"
        caption="Total"
        :value="String(total).padStart(3, '0')"
        align="end"
      />
      <slot />
      <Button v-if="addLabel" @click="$emit('add')">
        <template #icon><Plus :size="14" aria-hidden="true" /></template>
        {{ addLabel }}
      </Button>
    </div>
  </div>
</template>
