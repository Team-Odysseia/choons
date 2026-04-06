<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useDrawerStore } from '@/stores/drawer'
import { useRouter } from 'vue-router'
import { Library, ListMusic, LogOut, Send, X } from 'lucide-vue-next'

const auth = useAuthStore()
const drawer = useDrawerStore()
const router = useRouter()
const appVersion = __APP_VERSION__

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav
    class="col-start-1 row-start-1 bg-black flex flex-col overflow-hidden border-r border-border
           fixed inset-y-0 left-0 w-[var(--sidebar-w)] z-50 transition-transform duration-200
           md:static md:z-auto md:translate-x-0"
    :class="drawer.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    style="padding-top: var(--safe-area-top); padding-left: var(--safe-area-left)"
  >
    <!-- Mobile close button -->
    <button
      class="md:hidden absolute top-3 right-3 size-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      @click="drawer.closeSidebar()"
    >
      <X :size="18" />
    </button>

    <div class="flex-1 overflow-y-auto px-2 py-4">
      <div class="text-[22px] font-black tracking-tight text-primary px-3 pb-5">choons</div>

      <ul class="list-none mb-2">
        <li>
          <RouterLink
            to="/library"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
            @click="drawer.closeSidebar()"
          >
            <Library :size="20" />
            Library
          </RouterLink>
        </li>
        <li>
          <RouterLink
            to="/playlists"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
            @click="drawer.closeSidebar()"
          >
            <ListMusic :size="20" />
            Playlists
          </RouterLink>
        </li>
        <li v-if="!auth.isAdmin">
          <RouterLink
            to="/playlists/requests"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
            @click="drawer.closeSidebar()"
          >
            <Send :size="20" />
            Requests
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
            { to: '/admin/album-requests', label: 'Album Requests' },
          ]" :key="to">
            <RouterLink
              :to="to"
              class="flex items-center px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
              @click="drawer.closeSidebar()"
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
        <LogOut :size="15" />
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
