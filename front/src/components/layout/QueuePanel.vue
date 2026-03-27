<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import draggable from 'vuedraggable'
import { GripVertical, X } from 'lucide-vue-next'

const player = usePlayerStore()

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function onDragChange(event: any) {
  if (event.moved) player.reorderQueue()
}
</script>

<template>
  <div class="p-4">
    <div v-if="player.queue.length === 0" class="text-[13px] text-dimmed text-center py-8">
      Queue is empty
    </div>
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <span class="text-[12px] text-dimmed">
          {{ player.queue.length }} track{{ player.queue.length !== 1 ? 's' : '' }}
        </span>
        <button
          class="text-[12px] text-dimmed hover:text-destructive transition-colors"
          @click="player.clearQueue()"
        >
          Clear
        </button>
      </div>

      <draggable
        :list="player.queue"
        item-key="id"
        handle=".drag-handle"
        @change="onDragChange"
      >
        <template #item="{ element, index }">
          <div
            class="flex items-center gap-2 px-2 py-2 rounded transition-colors group"
            :class="index === player.currentIndex ? 'bg-muted' : 'hover:bg-muted/50'"
          >
            <GripVertical
              :size="14"
              class="drag-handle text-dimmed cursor-grab active:cursor-grabbing shrink-0"
            />
            <div class="flex flex-col min-w-0 flex-1 gap-0.5">
              <span
                class="text-[13px] font-medium truncate"
                :class="index === player.currentIndex ? 'text-primary' : 'text-foreground'"
              >{{ element.title }}</span>
              <span class="text-[11px] text-muted-foreground truncate">{{ element.artist.name }}</span>
            </div>
            <span class="text-[11px] text-dimmed shrink-0">{{ formatDuration(element.durationSeconds) }}</span>
            <button
              class="size-6 flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
              title="Remove"
              @click="player.removeFromQueue(index)"
            >
              <X :size="12" />
            </button>
          </div>
        </template>
      </draggable>
    </div>
  </div>
</template>
