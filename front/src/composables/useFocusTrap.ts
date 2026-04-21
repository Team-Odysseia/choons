import { ref, watch, onScopeDispose, type Ref } from 'vue'

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useFocusTrap(containerRef: Ref<HTMLElement | null>, active: Ref<boolean> | (() => boolean)) {
  let previouslyFocused: Element | null = null

  function getFocusableElements(): HTMLElement[] {
    if (!containerRef.value) return []
    return Array.from(containerRef.value.querySelectorAll(FOCUSABLE_SELECTORS))
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !containerRef.value) return

    const focusable = getFocusableElements()
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (first && event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (last && !event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const isActive = typeof active === 'function' ? active : () => active.value

  watch(isActive, (activeValue) => {
    if (activeValue) {
      previouslyFocused = document.activeElement
      const focusable = getFocusableElements()
      if (focusable.length > 0) {
        focusable[0]?.focus()
      } else {
        containerRef.value?.focus()
      }
      document.addEventListener('keydown', trapFocus)
    } else {
      document.removeEventListener('keydown', trapFocus)
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus()
      }
    }
  })

  onScopeDispose(() => {
    document.removeEventListener('keydown', trapFocus)
  })
}
