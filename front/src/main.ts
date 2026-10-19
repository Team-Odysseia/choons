import '@fontsource/doto/latin-700.css'
import '@fontsource/doto/latin-800.css'
import '@fontsource/doto/latin-900.css'
import '@fontsource/michroma/latin-400.css'
import '@fontsource/share-tech-mono/latin-400.css'
import './assets/main.css'
import 'vue-sonner/style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { MotionPlugin } from '@vueuse/motion'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { usePartyStore } from './stores/party'
import { bindIdentity, captureException, initTelemetry } from './lib/telemetry'

void initTelemetry({
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
  environment: import.meta.env.MODE,
  appVersion: __APP_VERSION__,
})

const app = createApp(App)
app.config.errorHandler = (error, _instance, info) => {
  captureException(error, { kind: 'vue', vue_info: info })
  console.error(error)
}
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueQueryPlugin)
app.use(MotionPlugin)

const auth = useAuthStore()
bindIdentity(() => auth.user)
auth.restoreSession().finally(() => {
  if (auth.isAuthenticated) {
    const party = usePartyStore()
    party.setCurrentUserId(auth.user!.id)
    void party.fetchMyParty()
  }
  app.mount('#app')
})
