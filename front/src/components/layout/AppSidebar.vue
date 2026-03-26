<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const appVersion = __APP_VERSION__

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="col-start-1 row-start-1 bg-black flex flex-col overflow-hidden border-r border-border">
    <div class="flex-1 overflow-y-auto px-2 py-4">
      <div class="text-[22px] font-black tracking-tight text-primary px-3 pb-5">choons</div>

      <ul class="list-none mb-2">
        <li>
          <RouterLink
            to="/library"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l9 7.5V21h-6v-5H9v5H3V10.5L12 3z" />
            </svg>
            Library
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/playlists"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h12v2H3z" />
            </svg>
            Playlists
          </RouterLink>
        </li>
      </ul>

      <template v-if="auth.isAdmin">
        <div
          class="text-[11px] font-bold uppercase tracking-widest text-dimmed px-3 pt-4 pb-2"
        >
          Admin
        </div>
        <ul class="list-none">
          <li v-for="{ to, label } in [
            { to: '/admin/listeners', label: 'Listeners' },
            { to: '/admin/artists', label: 'Artists' },
            { to: '/admin/albums', label: 'Albums' },
            { to: '/admin/tracks', label: 'Tracks' },
          ]" :key="to">
            <RouterLink
              :to="to"
              class="flex items-center px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
            >
              {{ label }}
            </RouterLink>
          </li>
        </ul>
      </template>
    </div>

    <div class="flex items-center justify-between px-4 py-3 border-t border-border">
      <span class="text-[13px] font-semibold text-muted-foreground truncate">
        {{ auth.user?.username }}
      </span>
      <button
        class="flex items-center gap-1.5 text-[12px] font-semibold text-dimmed hover:text-destructive transition-colors shrink-0"
        @click="logout"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zm5-9H11v2h10v14H11v2h12V4z" />
        </svg>
        Log out
      </button>
    </div>

    <div class="px-4 py-3 border-t border-border flex flex-col gap-1 items-center">
      <span class="text-[11px] text-dimmed">{{ appVersion }}</span>
      <a
        href="https://www.odysseia.dev/"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[11px] text-dimmed hover:text-muted-foreground transition-colors"
      >Made by Odysseia</a>
    </div>
  </nav>
</template>
