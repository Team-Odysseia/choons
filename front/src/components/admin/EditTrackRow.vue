<script setup lang="ts">
import { computed } from 'vue'
import { ExternalLink, GripVertical, X } from 'lucide-vue-next'
import { IconKey } from '@/components/vfd'
import { formatDuration } from '@/lib/format'

const props = defineProps<{
  index: number
  title: string
  lyricsId?: number | null
  duration?: number
  showLyrics?: boolean
  lyricsSearch?: string
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:lyricsId': [value: number | null]
  remove: []
}>()

const number = computed(() => String(props.index + 1).padStart(2, '0'))

function onTitle(event: Event) {
  if (event.target instanceof HTMLInputElement) emit('update:title', event.target.value)
}

function onLyrics(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const raw = event.target.value.trim()
  const parsed = Number.parseInt(raw, 10)
  emit('update:lyricsId', raw === '' || Number.isNaN(parsed) ? null : parsed)
}

const miniInput =
  'h-[30px] rounded-[3px] border border-line bg-glass px-2.5 font-body text-[13px] text-fg shadow-[inset_0_2px_4px_#000000aa] outline-none focus:border-cyan-dim'
</script>

<template>
  <div class="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
    <span class="w-6 font-display text-sm font-extrabold text-faint">{{ number }}</span>
    <GripVertical :size="14" class="drag-handle shrink-0 cursor-grab text-faint" aria-hidden="true" />
    <input
      data-testid="track-title-input"
      :value="title"
      :class="[miniInput, 'min-w-0 flex-1']"
      aria-label="Track title"
      @input="onTitle"
    />
    <div v-if="showLyrics" class="flex items-center gap-1.5">
      <input
        data-testid="track-lyrics-input"
        :value="lyricsId ?? ''"
        inputmode="numeric"
        placeholder="—"
        :class="[miniInput, 'w-[90px]']"
        aria-label="Lyrics ID"
        @input="onLyrics"
      />
      <a
        :href="lyricsSearch ?? 'https://lrclib.net/search'"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Search lyrics on lrclib.net"
        class="text-cyan-dim transition-colors hover:text-cyan"
      >
        <ExternalLink :size="14" aria-hidden="true" />
      </a>
    </div>
    <span v-if="duration !== undefined" class="w-11 text-right font-display text-sm font-bold text-soft">{{ formatDuration(duration) }}</span>
    <IconKey bare :icon="X" label="Remove track" :size="26" @click="emit('remove')" />
  </div>
</template>
