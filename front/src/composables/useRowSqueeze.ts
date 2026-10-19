import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

const CARD = '[data-album-card]'

function cardsOf(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(CARD))
}

function reset(container: HTMLElement) {
  for (const card of cardsOf(container)) card.style.transform = ''
}

function squeeze(container: HTMLElement, hovered: HTMLElement, shift: number) {
  const row = cardsOf(container).filter((card) => card.offsetTop === hovered.offsetTop)
  const index = row.indexOf(hovered)
  const last = row.length - 1
  const span = last - index - 1
  for (const [j, card] of row.entries()) {
    const offset = j > index && j < last && span > 0 ? Math.round((shift * (last - j)) / span) : 0
    card.style.transform = offset ? `translateX(${offset}px)` : ''
  }
}

export function useRowSqueeze(
  container: Ref<HTMLElement | undefined>,
  shift = 56,
  enabled: () => boolean = () => true,
) {
  function onEnter(event: Event) {
    const el = container.value
    if (!el || !enabled() || !(event.target instanceof Element)) return
    const hovered = event.target.closest<HTMLElement>(CARD)
    if (hovered && el.contains(hovered)) squeeze(el, hovered, shift)
  }

  function onLeave() {
    if (container.value) reset(container.value)
  }

  useEventListener(container, 'mouseover', onEnter)
  useEventListener(container, 'focusin', onEnter)
  useEventListener(container, 'mouseleave', onLeave)
  useEventListener(container, 'focusout', onLeave)
}
