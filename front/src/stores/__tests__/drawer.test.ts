import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDrawerStore } from '../drawer'

describe('useDrawerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no active panel', () => {
    const drawer = useDrawerStore()
    expect(drawer.activePanel).toBeNull()
  })

  it('toggle opens a panel', () => {
    const drawer = useDrawerStore()
    drawer.toggle('queue')
    expect(drawer.activePanel).toBe('queue')
  })

  it('toggle switches to a different panel', () => {
    const drawer = useDrawerStore()
    drawer.toggle('queue')
    drawer.toggle('lyrics')
    expect(drawer.activePanel).toBe('lyrics')
  })

  it('toggle closes the panel when toggling the same one', () => {
    const drawer = useDrawerStore()
    drawer.toggle('queue')
    drawer.toggle('queue')
    expect(drawer.activePanel).toBeNull()
  })

  it('close sets activePanel to null', () => {
    const drawer = useDrawerStore()
    drawer.toggle('lyrics')
    drawer.close()
    expect(drawer.activePanel).toBeNull()
  })
})
