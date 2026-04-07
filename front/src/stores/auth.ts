import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, logout as apiLogout, me as apiMe } from '@/api/auth'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { UserResponse } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserResponse | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const data = await apiLogin(username, password)
      if (!data.token) {
        throw new Error('Missing auth token in login response')
      }
      await fetchMe()
      await usePartyStore().fetchMyParty()
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    try {
      user.value = await apiMe()
    } catch {
      logout()
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {
      // ignore logout API failures; still clear client state
    }
    usePartyStore().stopPolling()
    usePlayerStore().stop()
    user.value = null
  }

  return { user, loading, isAuthenticated, isAdmin, login, logout, fetchMe }
})
