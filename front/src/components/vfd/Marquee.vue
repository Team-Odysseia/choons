<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { prefersReducedMotion } from '@/lib/motion'

const props = withDefaults(defineProps<{ text: string; sub?: string; mode?: 'loop' | 'bounce' }>(), {
  mode: 'loop',
})

const GAP = 48
const LOOP_SPEED = 40
const BOUNCE_SPEED = 25

const container = ref<HTMLElement>()
const content = ref<HTMLElement>()
const contentWidth = ref(0)
const containerWidth = ref(0)

function measure() {
  if (!container.value || !content.value) return
  contentWidth.value = content.value.scrollWidth
  containerWidth.value = container.value.clientWidth
}

const overflowing = computed(() => contentWidth.value > containerWidth.value)
const moving = computed(() => overflowing.value && !prefersReducedMotion.value)
const scrolling = computed(() => moving.value && props.mode === 'loop')
const bouncing = computed(() => moving.value && props.mode === 'bounce')

const trackStyle = computed(() => {
  if (bouncing.value) {
    const distance = contentWidth.value - containerWidth.value
    return {
      '--marquee-distance': `${distance}px`,
      '--marquee-duration': `${distance / BOUNCE_SPEED + 2}s`,
    }
  }
  const distance = contentWidth.value + GAP
  return {
    '--marquee-distance': `${distance}px`,
    '--marquee-duration': `${distance / LOOP_SPEED + 1.5}s`,
  }
})

useResizeObserver(container, measure)
onMounted(measure)
watch(
  () => props.text,
  async () => {
    await nextTick()
    measure()
  },
)
</script>

<template>
  <div
    ref="container"
    :class="['vfd-marquee relative overflow-hidden', { 'is-scrolling': scrolling, 'is-bouncing': bouncing }]"
  >
    <div class="vfd-marquee__track flex w-max whitespace-nowrap" :class="{ 'max-w-full': overflowing && !moving }" :style="trackStyle">
      <span ref="content" data-marquee-copy :class="['block', overflowing && !moving && 'truncate']">{{ text }}</span>
      <span v-if="scrolling" data-marquee-copy aria-hidden="true" class="block" :style="{ paddingLeft: `${GAP}px` }">{{ text }}</span>
    </div>
    <div v-if="sub" class="mt-1 truncate font-label text-[9px] uppercase tracking-[0.2em] text-soft">{{ sub }}</div>
    <template v-if="scrolling">
      <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-glass to-transparent" />
      <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-glass to-transparent" />
    </template>
  </div>
</template>

<style scoped>
.is-scrolling .vfd-marquee__track {
  animation: vfd-marquee var(--marquee-duration) linear infinite;
}

.is-bouncing .vfd-marquee__track {
  animation: vfd-marquee-bounce var(--marquee-duration) ease-in-out infinite alternate;
}

.is-scrolling:hover .vfd-marquee__track,
.is-bouncing:hover .vfd-marquee__track {
  animation-play-state: paused;
}

@keyframes vfd-marquee {
  0%,
  18% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(var(--marquee-distance) * -1));
  }
}

@keyframes vfd-marquee-bounce {
  0%,
  20% {
    transform: translateX(0);
  }
  80%,
  100% {
    transform: translateX(calc(var(--marquee-distance) * -1));
  }
}
</style>
