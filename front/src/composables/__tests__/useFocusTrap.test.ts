import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useFocusTrap } from '../useFocusTrap'

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('foca primeiro elemento focavel quando ativado', async () => {
    const container = document.createElement('div')
    container.innerHTML = `
      <button id="first">First</button>
      <button id="last">Last</button>
    `
    document.body.appendChild(container)

    const active = ref(false)
    const containerRef = ref(container)

    mount(
      defineComponent({
        setup() {
          useFocusTrap(containerRef, active)
          return () => null
        },
      }),
    )

    await nextTick()
    expect(document.activeElement).toBe(document.body)

    active.value = true
    await nextTick()

    expect(document.activeElement).toBe(document.getElementById('first'))
  })
})
