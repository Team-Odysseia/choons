<script setup lang="ts">
import { useDrawerStore } from '@/stores/drawer'
import QueuePanel from './QueuePanel.vue'
import LyricsPanel from './LyricsPanel.vue'
import { ListMusic, Mic2, X } from 'lucide-vue-next'

const drawer = useDrawerStore()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="drawer.activePanel"
        class="fixed right-0 top-0 w-full md:w-[300px] bg-card border-l border-border flex flex-col z-40"
        style="height: calc(100vh - var(--player-h)); padding-top: var(--safe-area-top); padding-right: var(--safe-area-right)"
      >
        <!-- Tab header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <div class="flex items-center gap-1">
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-colors"
              :class="drawer.activePanel === 'queue'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'"
              @click="drawer.toggle('queue')"
            >
              <ListMusic :size="14" />
              Queue
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-semibold transition-colors"
              :class="drawer.activePanel === 'lyrics'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'"
              @click="drawer.toggle('lyrics')"
            >
              <Mic2 :size="14" />
              Lyrics
            </button>
          </div>
          <button
            class="size-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded"
            title="Close"
            @click="drawer.close()"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- Panel content -->
        <div class="flex-1 overflow-y-auto">
          <QueuePanel v-if="drawer.activePanel === 'queue'" />
          <LyricsPanel v-else />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
