<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import MusicPlayer from './MusicPlayer.vue'
import RightDrawer from './RightDrawer.vue'
import { useDrawerStore } from '@/stores/drawer'

const drawer = useDrawerStore()
const route = useRoute()

const shellClass = computed(() => {
  const shell = route.meta.shell as string | undefined
  if (shell === 'form') return 'page-shell page-shell--form'
  return 'page-shell page-shell--wide'
})
</script>

<template>
  <!-- Mobile sidebar backdrop -->
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="drawer.sidebarOpen"
      class="fixed inset-0 z-40 bg-black/60 md:hidden"
      @click="drawer.closeSidebar()"
    />
  </Transition>

  <div
    class="grid [grid-template-columns:1fr] md:[grid-template-columns:var(--sidebar-w)_1fr] [grid-template-rows:minmax(0,1fr)_var(--player-h)]"
    style="height: var(--app-h);"
  >
    <AppSidebar />
    <main class="col-start-1 md:col-start-2 row-start-1 overflow-hidden flex flex-col">
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 md:px-6 md:py-6">
        <div :class="shellClass">
          <RouterView />
        </div>
      </div>
    </main>
    <MusicPlayer />
  </div>
  <RightDrawer />
</template>
