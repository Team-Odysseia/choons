<script setup lang="ts">
import { ref } from 'vue'
import { Music } from 'lucide-vue-next'

withDefaults(defineProps<{ title?: string }>(), { title: 'Drop audio files' })
const emit = defineEmits<{ files: [files: File[]] }>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function onDrop(event: DragEvent) {
  isDragOver.value = false
  const files = event.dataTransfer?.files
  if (files && files.length) emit('files', Array.from(files))
}

function onChange(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const files = event.target.files
  if (files && files.length) emit('files', Array.from(files))
  event.target.value = ''
}
</script>

<template>
  <div
    data-dropzone
    :data-active="isDragOver ? '' : undefined"
    role="button"
    tabindex="0"
    :class="[
      'vfd-well vfd-scanlines flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md px-5 py-5 text-center transition-shadow',
      isDragOver && 'border-cyan! shadow-[inset_0_3px_10px_#000000ee,0_0_18px_#5CF6E840]',
    ]"
    @click="fileInput?.click()"
    @keydown.enter.prevent="fileInput?.click()"
    @keydown.space.prevent="fileInput?.click()"
    @dragover.prevent="isDragOver = true"
    @dragleave.prevent="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <Music :size="24" :class="isDragOver ? 'text-cyan' : 'text-cyan-dim'" aria-hidden="true" />
    <span class="font-display text-[15px] font-extrabold uppercase text-cyan glow-sm">{{ title }}</span>
    <span class="text-xs text-soft">MP3, FLAC, OGG, WAV, AAC</span>
    <input
      ref="fileInput"
      type="file"
      accept="audio/mpeg,audio/ogg,audio/flac,audio/wav,audio/aac"
      multiple
      class="hidden"
      @change="onChange"
    />
  </div>
</template>
