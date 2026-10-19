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
  <div class="flex flex-col gap-2.5">
    <span v-if="label" data-label class="font-label text-[10px] uppercase tracking-[0.2em] text-soft">{{ label }}</span>

    <div v-if="shownUrl" class="relative w-fit pr-2 pt-2">
      <img
        :src="shownUrl"
        class="size-32 rounded-[3px] border border-bezel-mid object-cover"
        alt="Preview"
      />
      <button
        type="button"
        class="absolute right-0 top-0 flex size-6 items-center justify-center rounded-full bg-red text-[#1A0505] shadow-[0_0_8px_#FF4A4A88] transition-opacity hover:opacity-90"
        aria-label="Remove image"
        @click="onRemove"
      >
        <X :size="14" />
      </button>
    </div>

    <div
      data-dropzone
      :data-active="isDragOver ? '' : undefined"
      role="button"
      tabindex="0"
      :class="[
        'vfd-well vfd-scanlines flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md px-5 py-7 text-center transition-shadow',
        isDragOver ? 'border-cyan! shadow-[inset_0_3px_10px_#000000ee,0_0_18px_#5CF6E840]' : '',
      ]"
      @click="fileInput?.click()"
      @keydown.enter.prevent="fileInput?.click()"
      @keydown.space.prevent="fileInput?.click()"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <ImagePlus :size="28" :class="isDragOver ? 'text-cyan' : 'text-cyan-dim'" aria-hidden="true" />
      <span class="font-display text-lg font-extrabold text-cyan glow-sm">
        {{ shownUrl ? 'Replace image' : 'Upload image' }}
      </span>
      <span class="text-xs text-soft">JPG, PNG, WebP, GIF</span>
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
