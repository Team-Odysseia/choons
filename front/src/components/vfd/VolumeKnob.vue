<script setup lang="ts">
import { computed, ref } from 'vue'
import { SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'

const props = defineProps<{ modelValue: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const clamped = computed(() => Math.min(1, Math.max(0, props.modelValue)))
const sweep = computed(() => Math.round(270 * clamped.value))
const percent = computed(() => Math.round(clamped.value * 100))
const focused = ref(false)

function setValue(value: number) {
  emit('update:modelValue', Math.round(Math.min(1, Math.max(0, value)) * 100) / 100)
}

function onUpdate(values: number[] | undefined) {
  const v = values?.[0]
  if (v !== undefined) setValue(v)
}

function onWheel(event: WheelEvent) {
  setValue(clamped.value + (event.deltaY < 0 ? 0.05 : -0.05))
}
</script>

<template>
  <div class="flex flex-col items-center gap-1.5">
    <div
      data-knob
      :class="['relative size-[76px] cursor-ns-resize rounded-full', focused && 'knob-focus']"
      :data-focused="focused ? '' : undefined"
      :style="{ '--sweep': `${sweep}deg` }"
      @wheel.prevent="onWheel"
      @focusin="focused = true"
      @focusout="focused = false"
    >
      <span aria-hidden="true" class="knob-ring knob-ring--ghost" />
      <span aria-hidden="true" class="knob-ring knob-ring--lit" />
      <span aria-hidden="true" class="knob-body" />
      <span aria-hidden="true" class="knob-pointer"><span /></span>
      <SliderRoot
        :model-value="[clamped]"
        :max="1"
        :step="0.01"
        orientation="vertical"
        class="absolute inset-0 flex touch-none select-none flex-col items-center"
        @update:model-value="onUpdate"
      >
        <SliderTrack class="relative w-full grow" />
        <SliderThumb aria-label="Volume" class="block size-px opacity-0" />
      </SliderRoot>
    </div>
    <div class="flex items-center gap-1.5" aria-hidden="true">
      <span class="font-label text-[8px] tracking-[0.2em] text-faint">VOL</span>
      <span class="font-seg text-[13px] text-cyan glow-sm">{{ percent }}</span>
    </div>
  </div>
</template>

<style scoped>
.knob-focus {
  outline: 2px solid #5cf6e8;
  outline-offset: 3px;
  box-shadow: 0 0 14px #5cf6e866;
}

.knob-ring {
  position: absolute;
  inset: 0;
  border-radius: 9999px;
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
}

.knob-ring--ghost {
  background: conic-gradient(from 225deg, #5cf6e81a 0deg 270deg, transparent 270deg);
}

.knob-ring--lit {
  background: conic-gradient(from 225deg, #5cf6e8 0deg var(--sweep), transparent var(--sweep));
  filter: drop-shadow(0 0 4px #5cf6e899);
}

.knob-body {
  position: absolute;
  inset: 12px;
  border-radius: 9999px;
  background: radial-gradient(circle at 40% 30%, #6b767e, #2b3339 45%, #0d1114);
  border: 1px solid #00000088;
  box-shadow: 0 4px 8px #000000cc, inset 0 1px 0 #dce3e866;
}

.knob-pointer {
  position: absolute;
  inset: 0;
  transform: rotate(calc(225deg + var(--sweep)));
  pointer-events: none;
}

.knob-pointer > span {
  position: absolute;
  top: 18px;
  left: 50%;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  border-radius: 9999px;
  background: #5cf6e8;
  box-shadow: 0 0 8px #5cf6e899;
}
</style>
