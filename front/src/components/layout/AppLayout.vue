<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import MusicPlayer from './MusicPlayer.vue'
import RightDrawer from './RightDrawer.vue'
import { useDrawerStore } from '@/stores/drawer'

const drawer = useDrawerStore()
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
    class="grid h-screen [grid-template-columns:1fr] md:[grid-template-columns:var(--sidebar-w)_1fr] [grid-template-rows:1fr_var(--player-h)]"
  >
    <AppSidebar />
    <main class="col-start-1 md:col-start-2 row-start-1 overflow-hidden flex flex-col">
      <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <RouterView />
      </div>
    </main>
    <MusicPlayer />
  </div>
  <RightDrawer />
</template>
