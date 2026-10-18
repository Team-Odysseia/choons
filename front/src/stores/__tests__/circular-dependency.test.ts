import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import { usePartyStore } from '../party'
import { usePlayerStore } from '../player'
import { emitter } from '@/lib/emitter'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  emitter.all.clear()
})

describe('circular dependency', () => {
  it('auth, party e player stores podem ser instanciados sem erro de dependencia circular', () => {
    const auth = useAuthStore()
    const party = usePartyStore()
    const player = usePlayerStore()
    expect(auth).toBeDefined()
    expect(party).toBeDefined()
    expect(player).toBeDefined()
  })

  it('emitter events nao quebram ao comunicar auth e party', () => {
    const party = usePartyStore()
    const player = usePlayerStore()

    // Emite eventos entre stores sem imports diretos
    expect(() => {
      emitter.emit('auth:login', { userId: 'u-1' })
      emitter.emit('auth:logout')
      emitter.emit('party:left')
    }).not.toThrow()
  })
})
