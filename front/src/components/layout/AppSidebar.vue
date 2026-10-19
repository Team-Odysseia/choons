<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDrawerStore } from '@/stores/drawer'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { Disc3, Heart, Inbox, Library, ListMusic, LogOut, MicVocal, PartyPopper, Search, Send, Users, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { BrandPlate, IconKey, Marquee } from '@/components/vfd'
import SourceButton from './SourceButton.vue'
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
  stopPolling()
  if (document.visibilityState === 'hidden') return
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return
    void refreshUnseenRequests()
  }, 30000)
}

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && auth.isAdmin) {
    void refreshUnseenRequests()
    startPolling()
  } else {
    stopPolling()
  }
}

async function logout() {
  await auth.logout()
  router.push('/login')
}

const path = computed(() => route.path)

function isActive(key: string) {
  const p = path.value
  switch (key) {
    case 'library':
      return p.startsWith('/library') && route.name !== 'search'
    case 'search':
      return route.name === 'search'
    case 'playlists':
      return p.startsWith('/playlists') && !p.startsWith('/playlists/requests')
    case 'requests':
      return p.startsWith('/playlists/requests')
    default:
      return p.startsWith(key)
  }
}

const adminSources = [
  { to: '/admin/listeners', label: 'Listeners', icon: Users },
  { to: '/admin/artists', label: 'Artists', icon: MicVocal },
  { to: '/admin/albums', label: 'Albums', icon: Disc3 },
  { to: '/admin/album-requests', label: 'Album Requests', icon: Inbox },
]

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
  document.addEventListener('visibilitychange', handleVisibilityChange)
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
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <nav
    class="fixed inset-y-0 left-0 z-50 col-start-1 row-start-1 flex w-[var(--sidebar-w)] flex-col overflow-hidden border-r border-bezel-lo bg-[linear-gradient(to_right,#0E1418,#080C0E)] transition-transform duration-200 md:static md:z-auto md:translate-x-0"
    :class="drawer.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    style="padding-top: var(--safe-area-top); padding-left: var(--safe-area-left)"
  >
    <IconKey
      :icon="X"
      label="Close menu"
      bare
      :size="32"
      class="absolute right-2 top-2 z-10 md:hidden"
      @click="drawer.closeSidebar()"
    />

    <div class="flex-1 overflow-y-auto px-[18px] py-[22px]">
      <BrandPlate />

      <div class="px-3.5 pb-1.5 pt-[18px] font-label text-[8px] uppercase tracking-[0.3em] text-faint" aria-hidden="true">Source</div>
      <ul class="flex list-none flex-col gap-1">
        <li>
          <SourceButton to="/library" :icon="Library" label="Library" :active="isActive('library')" @click="drawer.closeSidebar()" />
        </li>
        <li>
          <SourceButton :icon="Search" label="Search" :active="isActive('search')" @click="openSearchDialog" />
        </li>
        <li>
          <SourceButton to="/favorites" :icon="Heart" label="Favorites" :active="isActive('/favorites')" @click="drawer.closeSidebar()" />
        </li>
        <li>
          <SourceButton to="/playlists" :icon="ListMusic" label="Playlists" :active="isActive('playlists')" @click="drawer.closeSidebar()" />
        </li>
        <li>
          <SourceButton to="/parties" :icon="PartyPopper" label="Parties" :active="isActive('/parties')" @click="drawer.closeSidebar()" />
        </li>
        <li v-if="!auth.isAdmin">
          <SourceButton to="/playlists/requests" :icon="Send" label="Requests" :active="isActive('requests')" @click="drawer.closeSidebar()" />
        </li>
      </ul>

      <template v-if="auth.isAdmin">
        <div class="px-3.5 pb-1.5 pt-[18px] font-label text-[8px] uppercase tracking-[0.3em] text-amber">Admin</div>
        <ul class="flex list-none flex-col gap-1">
          <li v-for="source in adminSources" :key="source.to">
            <SourceButton
              :to="source.to"
              :icon="source.icon"
              :label="source.label"
              :active="isActive(source.to)"
              :count="source.to === '/admin/album-requests' ? unseenRequests : undefined"
              @click="drawer.closeSidebar()"
            />
          </li>
        </ul>
      </template>
    </div>

    <div class="flex flex-col gap-3 border-t border-line px-[18px] pb-4 pt-3.5">
      <div class="flex items-center gap-2.5 px-1">
        <span aria-hidden="true" class="led led-on" />
        <Marquee data-testid="sidebar-user" :text="auth.user?.username ?? ''" mode="bounce" class="min-w-0 flex-1 text-sm text-fg" />
        <Button variant="ghost" size="sm" class="px-1 hover:text-red" @click="logout">
          <template #icon><LogOut :size="13" aria-hidden="true" /></template>
          Log out
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-x-2 font-label text-[7px] uppercase tracking-[0.18em] text-faint">
        <span>FW {{ appVersion }}</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://www.odysseia.dev/"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-soft"
        >Made by Odysseia</a>
      </div>
    </div>
  </nav>

  <BaseDialog :open="searchDialogOpen" title="Search" max-width-class="max-w-[560px]" @close="searchDialogOpen = false">
    <div class="flex flex-col gap-3.5 px-5 pb-5">
      <Input
        v-model="searchQuery"
        placeholder="Search public playlists, songs, albums, artists"
        @keydown.enter="submitSearch"
      />
      <p class="text-xs text-faint">Press Enter to search songs, albums, artists and playlists.</p>
    </div>
  </BaseDialog>
</template>
