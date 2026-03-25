<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
import MusicPlayer from './MusicPlayer.vue'
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="app-main">
      <div class="app-content">
        <RouterView />
      </div>
    </main>
    <MusicPlayer />
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: 1fr var(--player-h);
  height: 100vh;
}

.app-main {
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}
</style>
