<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useLyricsStore } from '@/stores/lyrics'
import { usePlayerStore } from '@/stores/player'
import { StatePlate } from '@/components/vfd'
import { prefersReducedMotion } from '@/lib/motion'

const lyrics = useLyricsStore()
const player = usePlayerStore()
const lineRefs = ref<HTMLElement[]>([])

watch(
  () => lyrics.activeLineIndex,
  async (idx) => {
    if (idx < 0) return
    await nextTick()
    lineRefs.value[idx]?.scrollIntoView({ behavior: prefersReducedMotion.value ? 'auto' : 'smooth', block: 'center' })
  },
)
</script>

<template>
  <div class="px-5 py-5">
    <StatePlate v-if="lyrics.loading" kind="loading" code="SEEK LYRICS" message="Fetching lyrics…" />

    <StatePlate v-else-if="!lyrics.plainLyrics && !lyrics.hasTimedLyrics" code="NO LYRICS" message="No lyrics found" />

    <div v-else-if="lyrics.hasTimedLyrics" class="flex flex-col gap-3.5 py-2">
      <p
        v-for="(line, i) in lyrics.lines"
        :key="i"
        :ref="(el) => { if (el) lineRefs[i] = el as HTMLElement }"
        :aria-current="i === lyrics.activeLineIndex ? 'true' : undefined"
        :class="[
          'lyric-line cursor-pointer transition-[color,opacity] duration-150 hover:text-fg',
          i === lyrics.activeLineIndex
            ? 'font-display text-[22px] font-extrabold leading-tight text-cyan glow-lg'
            : 'text-[15px] leading-snug text-faint',
          i < lyrics.activeLineIndex && 'opacity-55',
        ]"
        @click="player.seek(line.timeMs / 1000)"
      >
        {{ line.text }}
      </p>
    </div>

    <div v-else class="py-2">
      <pre class="whitespace-pre-wrap font-body text-sm leading-relaxed text-soft">{{ lyrics.plainLyrics }}</pre>
    </div>
  </div>
</template>
