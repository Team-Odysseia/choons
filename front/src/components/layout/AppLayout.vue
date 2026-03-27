<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import MusicPlayer from './MusicPlayer.vue'
import RightDrawer from './RightDrawer.vue'
</script>

<template>
  <div
    class="grid h-screen [grid-template-columns:var(--sidebar-w)_1fr] [grid-template-rows:1fr_var(--player-h)]"
  >
    <AppSidebar />
    <main class="col-start-2 row-start-1 overflow-hidden flex flex-col">
      <div class="flex-1 overflow-y-auto p-8">
        <RouterView />
      </div>
    </main>
    <MusicPlayer />
  </div>
  <RightDrawer />
</template>
