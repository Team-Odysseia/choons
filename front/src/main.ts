import './assets/main.css'
import 'vue-sonner/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { usePartyStore } from './stores/party'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin)

// Restore session before first navigation
const auth = useAuthStore()
auth.fetchMe().finally(() => {
  if (auth.isAuthenticated) {
    const party = usePartyStore()
    party.setCurrentUserId(auth.user!.id)
    void party.fetchMyParty()
  }
  app.mount('#app')
})
