import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import type { UserResponse } from '@/api/types'
import router from '../index'

const me = vi.hoisted(() => vi.fn())
vi.mock('@/api/auth', () => ({ login: vi.fn(), logout: vi.fn(), me }))

const stubView = { template: '<div />' }
for (const route of router.getRoutes()) {
  if (route.components?.default) route.components.default = stubView
}

function signIn(role: UserResponse['role'] | null) {
  const user = role ? { id: 'u-1', username: 'u', role } : null
  useAuthStore().user = user
  me.mockResolvedValue(user)
}

beforeEach(async () => {
  setActivePinia(createPinia())
  signIn(null)
  await router.push('/login')
})

describe('router guards', () => {
  it('sends anonymous users to login', async () => {
    await router.push('/library')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('keeps listeners out of admin pages', async () => {
    signIn('LISTENER')
    await router.push('/admin/listeners')
    expect(router.currentRoute.value.path).toBe('/library')
  })

  it('lets listeners open their album requests', async () => {
    signIn('LISTENER')
    await router.push({ name: 'album-requests' })
    expect(router.currentRoute.value.name).toBe('album-requests')
  })

  it('sends admins to the admin request queue instead of the listener page', async () => {
    signIn('ADMIN')
    await router.push({ name: 'album-requests' })
    expect(router.currentRoute.value.path).toBe('/admin/album-requests')
  })

  it('waits for the session to be restored on a cold start', async () => {
    setActivePinia(createPinia())
    me.mockResolvedValue({ id: 'u-1', username: 'u', role: 'LISTENER' })
    await router.push('/parties')
    expect(router.currentRoute.value.path).toBe('/parties')
  })

  it('redirects signed-in users away from login', async () => {
    signIn('LISTENER')
    await router.push('/library')
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/library')
  })
})
