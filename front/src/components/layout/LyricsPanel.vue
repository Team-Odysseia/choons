<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useLyricsStore } from '@/stores/lyrics'
import { usePlayerStore } from '@/stores/player'

const lyrics = useLyricsStore()
const player = usePlayerStore()
const lineRefs = ref<HTMLElement[]>([])

watch(
  () => lyrics.activeLineIndex,
  async (idx) => {
    if (idx < 0) return
    await nextTick()
    lineRefs.value[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  },
)
</script>

<template>
  <div class="p-4">
    <div v-if="lyrics.loading" class="text-[13px] text-dimmed text-center py-8">
      Fetching lyrics…
    </div>

    <div v-else-if="!lyrics.plainLyrics && !lyrics.hasTimedLyrics" class="text-[13px] text-dimmed text-center py-8">
      No lyrics found
    </div>

    <div v-else-if="lyrics.hasTimedLyrics" class="flex flex-col gap-3 py-4">
      <p
        v-for="(line, i) in lyrics.lines"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        class="text-[14px] leading-relaxed transition-all duration-300 px-2 cursor-pointer hover:text-foreground"
        :class="i === lyrics.activeLineIndex
          ? 'text-foreground font-semibold scale-[1.02] origin-left'
          : 'text-muted-foreground'"
        @click="player.seek(line.timeMs / 1000)"
      >
        {{ line.text }}
      </p>
    </div>

    <div v-else class="py-4">
      <pre class="text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans px-2">{{ lyrics.plainLyrics }}</pre>
    </div>
  </div>
</template>
