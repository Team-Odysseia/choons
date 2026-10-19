<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { PartyQueueItemResponse } from '@/api/types'
import draggable from 'vuedraggable'
import { Lock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { StatePlate, VfdBadge } from '@/components/vfd'
import QueueRow from './QueueRow.vue'

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
  <div class="px-3 py-3.5">
    <template v-if="party.inParty">
      <StatePlate v-if="partyItems.length === 0" code="QUEUE EMPTY" message="Queue is empty" />
      <div v-else class="flex flex-col gap-1">
        <div class="flex items-center justify-between px-1.5 pb-2.5">
          <span class="font-display text-lg font-extrabold text-cyan glow-sm">
            {{ partyItems.length }} track{{ partyItems.length !== 1 ? 's' : '' }}
          </span>
          <VfdBadge tone="amber" label="Party queue" />
        </div>

        <draggable
          :list="partyItems"
          item-key="id"
          handle=".drag-handle"
          :disabled="!party.canControl"
          @change="onPartyDragChange"
        >
          <template #item="{ element }">
            <QueueRow
              data-testid="party-queue-item"
              :title="element.track.title"
              :sub="`${element.track.artist.name} · added by ${element.addedByUsername}`"
              :duration="element.track.durationSeconds"
              :current="isPlayingItem(element)"
              :can-remove="party.canControl"
              :locked="!party.canControl"
              @remove="removePartyItem(element)"
            />
          </template>
        </draggable>

        <p
          v-if="!party.canControl"
          data-testid="queue-lock-note"
          class="flex items-center gap-2 px-2 pt-3 text-xs text-amber"
        >
          <Lock :size="12" aria-hidden="true" />
          Only DJs can reorder the party queue
        </p>
      </div>
    </template>

    <template v-else>
      <StatePlate v-if="player.queue.length === 0" code="QUEUE EMPTY" message="Queue is empty" />
      <div v-else class="flex flex-col gap-1">
        <div class="flex items-center justify-between px-1.5 pb-2.5">
          <span class="font-display text-lg font-extrabold text-cyan glow-sm">
            {{ player.queue.length }} track{{ player.queue.length !== 1 ? 's' : '' }}
          </span>
          <Button variant="ghost" size="sm" class="px-1 hover:text-red" @click="player.clearQueue()">Clear</Button>
        </div>

        <draggable
          :list="player.queue"
          item-key="id"
          handle=".drag-handle"
          @change="player.reorderQueue()"
        >
          <template #item="{ element, index }">
            <QueueRow
              data-testid="queue-item"
              :title="element.title"
              :sub="element.artist.name"
              :duration="element.durationSeconds"
              :current="index === player.currentIndex"
              can-remove
              @remove="player.removeFromQueue(index)"
            />
          </template>
        </draggable>
      </div>
    </template>
  </div>
</template>
