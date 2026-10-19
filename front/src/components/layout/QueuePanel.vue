<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { PartyQueueItemResponse } from '@/api/types'
import draggable from 'vuedraggable'
import { GripVertical, X } from 'lucide-vue-next'

const player = usePlayerStore()
const party = usePartyStore()

const partyItems = ref<PartyQueueItemResponse[]>([])

watch(
  () => party.state?.queue,
  (queue) => {
    partyItems.value = queue ? [...queue] : []
  },
  { immediate: true },
)

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function isPlayingItem(item: PartyQueueItemResponse) {
  return item.id === party.state?.playback.queueItemId
}

function onPartyDragChange() {
  if (!party.canControl) return
  void party.reorderQueueByIds(partyItems.value.map((item) => item.id))
}

function removePartyItem(item: PartyQueueItemResponse) {
  if (!party.canControl) return
  void party.removeQueueItem(item.id)
}
</script>

<template>
  <div class="p-4">
    <template v-if="party.inParty">
      <div v-if="partyItems.length === 0" class="text-[13px] text-dimmed text-center py-8">
        Queue is empty
      </div>
      <div v-else>
        <div class="flex items-center justify-between mb-3">
          <span class="text-[12px] text-dimmed">
            {{ partyItems.length }} track{{ partyItems.length !== 1 ? 's' : '' }}
          </span>
          <span class="text-[11px] text-dimmed">Party queue</span>
        </div>

        <draggable
          :list="partyItems"
          item-key="id"
          handle=".drag-handle"
          :disabled="!party.canControl"
          @change="onPartyDragChange"
        >
          <template #item="{ element }">
            <div
              data-testid="party-queue-item"
              class="flex items-center gap-2 px-2 py-2 rounded transition-colors group"
              :class="isPlayingItem(element) ? 'bg-muted' : 'hover:bg-muted/50'"
            >
              <GripVertical
                :size="14"
                class="drag-handle text-dimmed cursor-grab active:cursor-grabbing shrink-0"
                :class="party.canControl ? '' : 'opacity-40 cursor-not-allowed'"
              />
              <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                <span
                  class="text-[13px] font-medium truncate"
                  :class="isPlayingItem(element) ? 'text-primary' : 'text-foreground'"
                >{{ element.track.title }}</span>
                <span class="text-[11px] text-muted-foreground truncate">
                  {{ element.track.artist.name }} · added by {{ element.addedByUsername }}
                </span>
              </div>
              <span class="text-[11px] text-dimmed shrink-0">{{ formatDuration(element.track.durationSeconds) }}</span>
              <button
                v-if="party.canControl"
                class="size-6 flex items-center justify-center text-dimmed opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
                title="Remove"
                @click="removePartyItem(element)"
              >
                <X :size="12" />
              </button>
            </div>
          </template>
        </draggable>
      </div>
    </template>

    <template v-else>
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
          @change="player.reorderQueue()"
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
    </template>
  </div>
</template>
