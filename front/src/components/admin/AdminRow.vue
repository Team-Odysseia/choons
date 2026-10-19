<script setup lang="ts">
import { ref, watch } from 'vue'
import { Pencil, Trash2 } from 'lucide-vue-next'
import { IconKey, VfdBadge } from '@/components/vfd'

const failed = ref(false)

const props = withDefaults(
  defineProps<{
    primary: string
    secondary?: string
    thumb?: string | null
    round?: boolean
    blocked?: boolean
    editable?: boolean
    editLabel?: string
    deleteLabel?: string
    deleting?: boolean
  }>(),
  { editable: true, editLabel: 'Edit', deleteLabel: 'Delete' },
)
defineEmits<{ edit: []; delete: [] }>()

watch(
  () => props.thumb,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div class="flex items-center gap-4 rounded border border-line bg-panel px-4 py-3">
    <template v-if="thumb">
      <img
        v-if="!failed"
        :src="thumb"
        alt=""
        loading="lazy"
        :class="['size-10 shrink-0 border border-bezel-mid object-cover', round ? 'rounded-full' : 'rounded-[3px]']"
        @error="failed = true"
      />
      <span
        v-else
        data-placeholder
        aria-hidden="true"
        :class="['size-10 shrink-0 border border-bezel-mid bg-[linear-gradient(200deg,#123B3A,#0A1114)]', round ? 'rounded-full' : 'rounded-[3px]']"
      />
    </template>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="truncate text-[15px] text-fg">{{ primary }}</span>
      <span v-if="secondary" class="truncate text-[13px] text-soft">{{ secondary }}</span>
    </div>
    <VfdBadge v-if="blocked" tone="red" label="Blocked" />
    <slot name="actions" />
    <IconKey v-if="editable" :icon="Pencil" :label="editLabel" :size="32" @click="$emit('edit')" />
    <IconKey :icon="Trash2" :label="deleteLabel" :size="32" :disabled="deleting" class="text-red!" @click="$emit('delete')" />
  </div>
</template>
