<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDocumentVisibility, useRafFn } from '@vueuse/core'
import { simulateLevels } from '@/lib/spectrum'
import { prefersReducedMotion } from '@/lib/motion'

interface Props {
  active: boolean
  bars?: number
  segments?: number
  mini?: boolean
  seed?: number
}

const props = withDefaults(defineProps<Props>(), { bars: 24, segments: 12, seed: 3 })

const canvas = ref<HTMLCanvasElement>()
const visibility = useDocumentVisibility()
const peaks: number[] = []
const peakHeld: number[] = []

const LIT = '#5CF6E8'
const HOT = '#FF4FD8'
const GHOST = '#5CF6E81A'
const PEAK_HOLD_MS = 400
const PEAK_FALL_MS = 50

const running = computed(() => props.active && visibility.value === 'visible' && !prefersReducedMotion.value)

function draw(levels: number[], now: number) {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  const ratio = window.devicePixelRatio || 1
  const width = el.clientWidth
  const height = el.clientHeight
  if (el.width !== width * ratio || el.height !== height * ratio) {
    el.width = width * ratio
    el.height = height * ratio
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.clearRect(0, 0, width, height)
  const gap = props.mini ? 2 : 3
  const barW = (width - gap * (props.bars - 1)) / props.bars
  const segH = (height - gap * (props.segments - 1)) / props.segments
  levels.forEach((level, b) => {
    const prev = peaks[b] ?? 0
    if (level >= prev) {
      peaks[b] = level
      peakHeld[b] = now
    } else if (now - (peakHeld[b] ?? 0) > PEAK_HOLD_MS) {
      peaks[b] = Math.max(level, prev - 1)
      peakHeld[b] = now - PEAK_HOLD_MS + PEAK_FALL_MS
    }
    const peak = props.mini ? -1 : (peaks[b] ?? 0)
    for (let s = 0; s < props.segments; s++) {
      const on = s < level
      const isPeak = s === peak && s >= level
      const hot = !props.mini && s >= props.segments - 2
      const color = on || isPeak ? (hot ? HOT : LIT) : GHOST
      ctx.shadowBlur = on || isPeak ? 6 : 0
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.globalAlpha = isPeak ? 0.75 : 1
      ctx.fillRect(b * (barW + gap), height - (s + 1) * segH - s * gap, barW, segH)
    }
  })
  ctx.globalAlpha = 1
}

function drawStatic() {
  draw(simulateLevels(0, props.bars, props.segments, props.seed, props.active ? 0.35 : 0), 0)
}

const { pause, resume } = useRafFn(
  ({ timestamp }) => {
    draw(simulateLevels(timestamp, props.bars, props.segments, props.seed, 0.95), timestamp)
  },
  { immediate: false },
)

watch(
  running,
  (value) => {
    if (value) {
      resume()
    } else {
      pause()
      drawStatic()
    }
  },
  { immediate: true },
)

onMounted(() => {
  if (!running.value) drawStatic()
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" class="block h-full w-full" />
</template>
