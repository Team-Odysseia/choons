<script setup lang="ts">
import { computed } from 'vue'
import { SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  segments?: number
  tone?: 'cyan' | 'amber'
  interactive?: boolean
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  orientation?: 'horizontal' | 'vertical'
}

const props = withDefaults(defineProps<Props>(), {
  segments: 48,
  tone: 'cyan',
  max: 1,
  orientation: 'horizontal',
})

const emit = defineEmits<{ 'update:value': [value: number]; commit: [value: number] }>()

const ratio = computed(() => (props.max > 0 ? Math.min(1, Math.max(0, props.value / props.max)) : 0))
const litCount = computed(() => Math.round(ratio.value * props.segments))
const stepSize = computed(() => props.step ?? props.max / 100)
const vertical = computed(() => props.orientation === 'vertical')

const litClass = computed(() =>
  props.tone === 'amber' ? 'bg-amber shadow-[0_0_5px_#FFB23F99]' : 'bg-cyan shadow-[0_0_5px_#5CF6E899]',
)
const ghostClass = computed(() => (props.tone === 'amber' ? 'bg-amber-ghost' : 'bg-cyan-ghost'))

function onUpdate(values: number[] | undefined) {
  const v = values?.[0]
  if (v !== undefined) emit('update:value', v)
}

function onCommit(values: number[]) {
  const v = values[0]
  if (v !== undefined) emit('commit', v)
}
</script>

<template>
  <div :class="cn('relative', vertical ? 'h-full w-3' : 'h-3 w-full')">
    <div :class="cn('absolute inset-0 flex gap-[2px]', vertical ? 'flex-col-reverse' : 'flex-row items-center')" aria-hidden="true">
      <span
        v-for="i in segments"
        :key="i"
        data-seg
        :data-lit="i <= litCount ? '' : undefined"
        :class="
          cn(
            'flex-1 rounded-[1px]',
            vertical ? 'w-full' : 'h-[60%]',
            i <= litCount ? litClass : ghostClass,
            i === litCount && interactive && (vertical ? 'mx-[-2px]' : 'h-full'),
          )
        "
      />
    </div>
    <SliderRoot
      v-if="interactive"
      :model-value="[value]"
      :max="max"
      :step="stepSize"
      :disabled="disabled"
      :orientation="orientation"
      class="absolute inset-0 flex touch-none select-none items-center data-[orientation=vertical]:flex-col"
      @update:model-value="onUpdate"
      @value-commit="onCommit"
    >
      <SliderTrack class="relative h-full w-full grow" />
      <SliderThumb
        :aria-label="label"
        class="block size-3 rounded-full opacity-0 focus-visible:opacity-100 focus-visible:bg-cyan focus-visible:shadow-[0_0_8px_#5CF6E8]"
      />
    </SliderRoot>
  </div>
</template>
