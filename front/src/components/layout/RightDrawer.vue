<script setup lang="ts">
import { computed } from 'vue'
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { X } from 'lucide-vue-next'
import { useDrawerStore, type DrawerPanel } from '@/stores/drawer'
import { usePartyStore } from '@/stores/party'
import { IconKey } from '@/components/vfd'
import QueuePanel from './QueuePanel.vue'
import LyricsPanel from './LyricsPanel.vue'
import PartyPanel from './PartyPanel.vue'

const drawer = useDrawerStore()
const party = usePartyStore()

const tabs = computed(() => {
  const list: { value: DrawerPanel; label: string }[] = [
    { value: 'queue', label: 'Queue' },
    { value: 'lyrics', label: 'Lyrics' },
  ]
  if (party.inParty) list.push({ value: 'party', label: 'Party' })
  return list
})

function isPanel(value: unknown): value is DrawerPanel {
  return value === 'queue' || value === 'lyrics' || value === 'party'
}

function onTabChange(value: unknown) {
  if (isPanel(value)) drawer.activePanel = value
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-transform duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in motion-reduce:transition-none"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <TabsRoot
        v-if="drawer.activePanel"
        :model-value="drawer.activePanel"
        class="fixed right-0 top-0 z-40 flex w-full flex-col border-l border-bezel-mid bg-[linear-gradient(to_right,#05090B,#0A1013)] shadow-[-12px_0_30px_#000000cc] md:w-[340px]"
        style="height: calc(var(--app-h) - var(--player-h)); padding-top: var(--safe-area-top); padding-right: var(--safe-area-right)"
        @update:model-value="onTabChange"
      >
        <div class="flex shrink-0 items-center gap-1.5 border-b border-line px-3 py-3.5">
          <TabsList class="flex items-center gap-1.5" aria-label="Panels">
            <TabsTrigger
              v-for="tab in tabs"
              :key="tab.value"
              :value="tab.value"
              class="drawer-tab inline-flex h-8 items-center gap-2 rounded border border-chrome-lo/40 px-2.5 font-label text-[9px] uppercase tracking-[0.16em] text-soft shadow-[0_3px_6px_#000000b3] transition-colors hover:text-fg data-[state=active]:border-cyan-dim data-[state=active]:text-cyan data-[state=active]:glow-sm"
            >
              <span aria-hidden="true" class="led drawer-tab__led" />
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
          <span class="flex-1" />
          <IconKey bare :icon="X" label="Close panel" :size="28" @click="drawer.close()" />
        </div>

        <TabsContent value="queue" class="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none">
          <QueuePanel />
        </TabsContent>
        <TabsContent value="lyrics" class="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none">
          <LyricsPanel />
        </TabsContent>
        <TabsContent v-if="party.inParty" value="party" class="min-h-0 flex-1 overflow-y-auto focus-visible:outline-none">
          <PartyPanel />
        </TabsContent>
      </TabsRoot>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-tab {
  background: linear-gradient(to top, #0d1114, #2b3339);
}

.drawer-tab[data-state='active'] .drawer-tab__led {
  background: #5cf6e8;
  box-shadow: 0 0 8px #5cf6e899;
}
</style>
