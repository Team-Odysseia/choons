import { defineConfig, mergeConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default mergeConfig(
  // Herda alias e plugins do vite.config, mas sem tailwind/devtools que não fazem sentido em testes
  defineConfig({
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }),
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./vitest.setup.ts'],
      clearMocks: true,
    },
  }),
)
