<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { prefersReducedMotion } from '@/lib/motion'

const props = defineProps<{ text: string; sub?: string }>()

const GAP = 48
const SPEED = 40

const container = ref<HTMLElement>()
const content = ref<HTMLElement>()
const overflowing = ref(false)
const distance = ref(0)

function measure() {
  if (!container.value || !content.value) return
  const contentWidth = content.value.scrollWidth
  overflowing.value = contentWidth > container.value.clientWidth
  distance.value = contentWidth + GAP
}

const scrolling = computed(() => overflowing.value && !prefersReducedMotion.value)

const trackStyle = computed(() => ({
  '--marquee-distance': `${distance.value}px`,
  '--marquee-duration': `${distance.value / SPEED + 1.5}s`,
}))

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
  <div ref="container" :class="['vfd-marquee relative overflow-hidden', { 'is-scrolling': scrolling }]">
    <div class="vfd-marquee__track flex w-max whitespace-nowrap" :style="trackStyle">
      <span ref="content" data-marquee-copy class="block">{{ text }}</span>
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

.is-scrolling:hover .vfd-marquee__track {
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
</style>
