<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-top">
      <div class="logo">choons</div>

      <ul class="nav-list">
        <li>
          <RouterLink to="/library" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l9 7.5V21h-6v-5H9v5H3V10.5L12 3z"/>
            </svg>
            Library
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/playlists" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h12v2H3z"/>
            </svg>
            Playlists
          </RouterLink>
        </li>
      </ul>

      <template v-if="auth.isAdmin">
        <div class="nav-section-label">Admin</div>
        <ul class="nav-list">
          <li><RouterLink to="/admin/listeners" class="nav-link">Listeners</RouterLink></li>
          <li><RouterLink to="/admin/artists" class="nav-link">Artists</RouterLink></li>
          <li><RouterLink to="/admin/albums" class="nav-link">Albums</RouterLink></li>
          <li><RouterLink to="/admin/tracks" class="nav-link">Tracks</RouterLink></li>
        </ul>
      </template>
    </div>

    <div class="sidebar-bottom">
      <span class="username">{{ auth.user?.username }}</span>
      <button class="btn-icon logout-btn" @click="logout" title="Log out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zm5-9H11v2h10v14H11v2h12V4z"/>
        </svg>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  grid-column: 1;
  grid-row: 1 / 3;
  background: #000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
}

.sidebar-top {
  flex: 1;
  overflow-y: auto;
  padding: 16px 8px;
}

.logo {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: var(--accent);
  padding: 8px 12px 20px;
}

.nav-list {
  list-style: none;
  margin-bottom: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
  transition: all 0.15s;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-surface);
}

.nav-link.router-link-active {
  color: var(--text-primary);
}

.nav-section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 16px 12px 8px;
}

.sidebar-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.username {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  color: var(--text-muted);
  flex-shrink: 0;
}

.logout-btn:hover {
  color: var(--danger);
}
</style>
