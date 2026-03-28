import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DrawerPanel = 'queue' | 'lyrics'

export const useDrawerStore = defineStore('drawer', () => {
  const activePanel = ref<DrawerPanel | null>(null)
  const sidebarOpen = ref(false)

  function toggle(panel: DrawerPanel) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  function close() {
    activePanel.value = null
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  return { activePanel, sidebarOpen, toggle, close, toggleSidebar, closeSidebar }
})
