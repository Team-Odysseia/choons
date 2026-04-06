import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { login as apiLogin, me as apiMe } from '@/api/auth'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { UserResponse } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const token = useLocalStorage<string | null>('token', null)
  const user = ref<UserResponse | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(username: string, password: string) {
    loading.value = true
    try {
      const data = await apiLogin(username, password)
      token.value = data.token
      await fetchMe()
      await usePartyStore().fetchMyParty()
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      user.value = await apiMe()
    } catch {
      logout()
    }
  }

  function logout() {
    usePartyStore().stopPolling()
    usePlayerStore().stop()
    token.value = null
    user.value = null
  }

  return { token, user, loading, isAuthenticated, isAdmin, login, logout, fetchMe }
})
