import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { mount } from '@vue/test-utils'
import { useRowSqueeze } from '../useRowSqueeze'

function harness(rows: number[], enabled = () => true) {
  return defineComponent({
    setup() {
      const container = ref<HTMLElement>()
      useRowSqueeze(container, 56, enabled)
      return () =>
        h(
          'div',
          { ref: container },
          rows.map((top, i) =>
            h('a', {
              'data-album-card': '',
              'data-i': String(i),
              onVnodeMounted: (vnode: VNode) => {
                if (vnode.el instanceof HTMLElement) Object.defineProperty(vnode.el, 'offsetTop', { value: top })
              },
            }),
          ),
        )
    },
  })
}

function shifts(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-album-card]').map((c) => (c.element as HTMLElement).style.transform)
}

describe('useRowSqueeze', () => {
  it('squeezes the cards after the hovered one, keeping the last card of the row in place', async () => {
    const wrapper = mount(harness([0, 0, 0, 0, 0]))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[1]!.trigger('mouseover')
    expect(shifts(wrapper)).toEqual(['', '', 'translateX(56px)', 'translateX(28px)', ''])
  })

  it('only moves cards in the hovered row', async () => {
    const wrapper = mount(harness([0, 0, 0, 300, 300, 300]))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[0]!.trigger('mouseover')
    expect(shifts(wrapper)).toEqual(['', 'translateX(56px)', '', '', '', ''])
  })

  it('moves nothing when the hovered card is last in its row', async () => {
    const wrapper = mount(harness([0, 0, 0]))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[2]!.trigger('mouseover')
    expect(shifts(wrapper)).toEqual(['', '', ''])
  })

  it('resets when the pointer leaves the grid', async () => {
    const wrapper = mount(harness([0, 0, 0, 0]))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[0]!.trigger('mouseover')
    await wrapper.trigger('mouseleave')
    expect(shifts(wrapper)).toEqual(['', '', '', ''])
  })

  it('follows keyboard focus too', async () => {
    const wrapper = mount(harness([0, 0, 0, 0]))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[0]!.trigger('focusin')
    expect(shifts(wrapper)).toEqual(['', 'translateX(56px)', 'translateX(28px)', ''])
    await wrapper.findAll('[data-album-card]')[0]!.trigger('focusout')
    expect(shifts(wrapper)).toEqual(['', '', '', ''])
  })

  it('does nothing while disabled', async () => {
    const wrapper = mount(harness([0, 0, 0, 0], () => false))
    await nextTick()
    await wrapper.findAll('[data-album-card]')[0]!.trigger('mouseover')
    expect(shifts(wrapper)).toEqual(['', '', '', ''])
  })
})
