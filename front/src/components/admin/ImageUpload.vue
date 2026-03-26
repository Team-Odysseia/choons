<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { ImagePlus, X } from 'lucide-vue-next'

const props = defineProps<{
  currentUrl?: string | null
  label?: string
  accept?: string
}>()

const emit = defineEmits<{
  select: [file: File]
  remove: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const preview = ref<string | null>(null)
const markedForRemoval = ref(false)
const isDragOver = ref(false)

const shownUrl = computed(() => {
  if (preview.value) return preview.value
  if (!markedForRemoval.value && props.currentUrl) return props.currentUrl
  return null
})

function onFileSelected(file: File) {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(file)
  markedForRemoval.value = false
  emit('select', file)
}

function onInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) onFileSelected(file)
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) onFileSelected(file)
}

function onRemove() {
  if (preview.value) {
    URL.revokeObjectURL(preview.value)
    preview.value = null
  }
  markedForRemoval.value = true
  emit('remove')
}

// expose so parent can reset preview after save
function reset() {
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = null
  markedForRemoval.value = false
}
defineExpose({ reset })

onUnmounted(() => {
  if (preview.value) URL.revokeObjectURL(preview.value)
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="label" class="text-sm font-medium text-foreground">{{ label }}</span>

    <!-- Image preview -->
    <div v-if="shownUrl" class="relative w-fit">
      <img
        :src="shownUrl"
        class="w-32 h-32 object-cover rounded-lg border border-border"
        alt="Preview"
      />
      <button
        type="button"
        class="absolute -top-2 -right-2 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow transition-opacity hover:opacity-90"
        aria-label="Remove image"
        @click="onRemove"
      >
        <X :size="12" />
      </button>
    </div>

    <!-- Drop zone / upload trigger -->
    <div
      class="flex flex-col items-center justify-center gap-1.5 rounded border-2 border-dashed px-4 py-5 text-center cursor-pointer transition-colors w-full"
      :class="isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'"
      @click="fileInput?.click()"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <ImagePlus :size="22" class="text-dimmed" />
      <span class="text-[13px] text-muted-foreground">
        {{ shownUrl ? 'Replace image' : 'Upload image' }}
      </span>
      <span class="text-[11px] text-dimmed">JPG, PNG, WebP, GIF</span>
    </div>

    <input
      ref="fileInput"
      type="file"
      :accept="accept ?? 'image/jpeg,image/png,image/webp,image/gif'"
      class="hidden"
      @change="onInputChange"
    />
  </div>
</template>
