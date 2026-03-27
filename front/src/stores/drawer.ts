import { defineStore } from 'pinia'
import { ref } from 'vue'

export type DrawerPanel = 'queue' | 'lyrics'

export const useDrawerStore = defineStore('drawer', () => {
  const activePanel = ref<DrawerPanel | null>(null)

  function toggle(panel: DrawerPanel) {
    activePanel.value = activePanel.value === panel ? null : panel
  }

  function close() {
    activePanel.value = null
  }

  return { activePanel, toggle, close }
})
