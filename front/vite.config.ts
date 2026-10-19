import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(
      `v${new Date().toISOString().slice(0, 10).replace(/-/g, '.')}`,
    ),
  },
  plugins: [
    tailwindcss(),
    vue(),
    mode === 'development' ? vueDevTools() : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/ingest/static': {
        target: 'https://us-assets.i.posthog.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
      '/ingest': {
        target: 'https://us.i.posthog.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ''),
      },
    },
  },
}))
