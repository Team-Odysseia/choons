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
      class="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] md:hidden"
      @click="drawer.closeSidebar()"
    />
  </Transition>

  <div
    class="grid bg-bg [grid-template-columns:1fr] md:[grid-template-columns:var(--sidebar-w)_1fr] [grid-template-rows:minmax(0,1fr)_var(--player-h)]"
    style="height: var(--app-h);"
  >
    <AppSidebar />
    <main class="col-start-1 row-start-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_150%_100%_at_62%_0%,#5CF6E812,transparent_70%)] md:col-start-2">
      <div class="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 md:px-12 md:py-9">
        <div :class="shellClass">
          <RouterView />
        </div>
      </div>
    </main>
    <MusicPlayer />
  </div>
  <RightDrawer />
</template>
