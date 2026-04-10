<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDrawerStore } from '@/stores/drawer'
import { useRoute, useRouter } from 'vue-router'
import { Library, ListMusic, LogOut, PartyPopper, Search, Send, X } from 'lucide-vue-next'
import { listAllAlbumRequests } from '@/api/albumRequests'
import { Input } from '@/components/ui/input'
import BaseDialog from '@/components/ui/dialog/BaseDialog.vue'

const auth = useAuthStore()
const drawer = useDrawerStore()
const router = useRouter()
const route = useRoute()
const appVersion = __APP_VERSION__
const unseenRequests = ref(0)
const searchDialogOpen = ref(false)
const searchQuery = ref('')

const LAST_SEEN_KEY = 'admin_album_requests_seen_at'
let pollTimer: ReturnType<typeof setInterval> | null = null

function readLastSeen() {
  try {
    return localStorage.getItem(LAST_SEEN_KEY)
  } catch {
    return null
  }
}

function setLastSeen(value: string) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, value)
  } catch {
    // ignore storage failures
  }
}

function markRequestsSeen() {
  setLastSeen(new Date().toISOString())
  unseenRequests.value = 0
}

async function refreshUnseenRequests() {
  if (!auth.isAdmin) {
    unseenRequests.value = 0
    return
  }

  try {
    const all = await listAllAlbumRequests()
    const lastSeen = readLastSeen()
    const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : 0

    unseenRequests.value = all.filter((req) => {
      if (req.status !== 'PENDING') return false
      const createdAtMs = new Date(req.createdAt).getTime()
      return Number.isFinite(createdAtMs) && createdAtMs > lastSeenMs
    }).length
  } catch {
    // ignore background polling failures
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    void refreshUnseenRequests()
  }, 30000)
}

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

async function logout() {
  await auth.logout()
  router.push('/login')
}

function openSearchDialog() {
  const q = route.name === 'search' && typeof route.query.q === 'string' ? route.query.q : ''
  searchQuery.value = q
  searchDialogOpen.value = true
  drawer.closeSidebar()
}

function submitSearch() {
  const query = searchQuery.value.trim()
  if (!query) return
  router.push({ name: 'search', query: { q: query } })
  searchDialogOpen.value = false
}

onMounted(() => {
  if (auth.isAdmin) {
    if (!readLastSeen()) {
      setLastSeen(new Date().toISOString())
    }
    if (route.path === '/admin/album-requests') {
      markRequestsSeen()
    } else {
      void refreshUnseenRequests()
    }
    startPolling()
  }
})

watch(
  () => route.path,
  (path) => {
    if (!auth.isAdmin) return
    if (path === '/admin/album-requests') {
      markRequestsSeen()
      return
    }
    void refreshUnseenRequests()
  },
)

watch(
  () => auth.isAdmin,
  (isAdmin) => {
    if (isAdmin) {
      void refreshUnseenRequests()
      startPolling()
    } else {
      unseenRequests.value = 0
      stopPolling()
    }
  },
)

onBeforeUnmount(() => {
  stopPolling()
})
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
          <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all"
            @click="openSearchDialog"
          >
            <Search :size="20" />
            Search
          </button>
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
        <li>
          <RouterLink
            to="/parties"
            class="flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
            @click="drawer.closeSidebar()"
          >
            <PartyPopper :size="20" />
            Parties
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
              class="flex items-center justify-between px-3 py-2.5 rounded text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-popover transition-all [&.router-link-active]:text-foreground"
              @click="drawer.closeSidebar()"
            >
              <span>{{ label }}</span>
              <span
                v-if="to === '/admin/album-requests' && unseenRequests > 0"
                class="ml-2 text-[10px] leading-none font-bold text-primary-foreground bg-primary rounded-full px-2 py-1"
              >
                {{ unseenRequests }}
              </span>
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

  <BaseDialog :open="searchDialogOpen" title="Search" @close="searchDialogOpen = false">
    <div class="px-5 pb-5">
      <Input
        v-model="searchQuery"
        placeholder="Search public playlists, songs, albums, artists"
        @keydown.enter="submitSearch"
      />
    </div>
  </BaseDialog>
</template>
