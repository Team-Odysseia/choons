import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

// scrollIntoView is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn()

vi.mock('@/api/lyrics', () => ({
  fetchLyricsByLrclibId: vi.fn().mockResolvedValue(null),
  searchLyrics: vi.fn().mockResolvedValue(null),
}))

describe('LyricsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows loading state', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const store = useLyricsStore()
    store.loading = true

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    expect(wrapper.text()).toContain('Fetching lyrics')
  })

  it('shows no lyrics found when not loading and no content', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const store = useLyricsStore()
    store.loading = false
    store.plainLyrics = null
    store.lines = []

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    expect(wrapper.text()).toContain('No lyrics found')
  })

  it('renders plain lyrics as pre block', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const store = useLyricsStore()
    store.loading = false
    store.plainLyrics = 'Verse one\nVerse two'
    store.lines = []

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    expect(wrapper.find('pre').text()).toContain('Verse one')
  })

  it('renders timed lines', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const store = useLyricsStore()
    store.loading = false
    store.plainLyrics = null
    store.lines = [
      { timeMs: 0, text: 'First line' },
      { timeMs: 5000, text: 'Second line' },
    ]

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    const paragraphs = wrapper.findAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]!.text()).toBe('First line')
    expect(paragraphs[1]!.text()).toBe('Second line')
  })

  it('seeks to line timestamp on click', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const { usePlayerStore } = await import('@/stores/player')
    const store = useLyricsStore()
    const player = usePlayerStore()
    store.loading = false
    store.plainLyrics = null
    store.lines = [
      { timeMs: 0, text: 'First line' },
      { timeMs: 7500, text: 'Second line' },
    ]
    const seekSpy = vi.spyOn(player, 'seek')

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    await wrapper.findAll('p')[1]!.trigger('click')
    expect(seekSpy).toHaveBeenCalledWith(7.5)
  })

  it('highlights the active line', async () => {
    const { useLyricsStore } = await import('@/stores/lyrics')
    const { usePlayerStore } = await import('@/stores/player')
    const store = useLyricsStore()
    const player = usePlayerStore()
    store.loading = false
    store.plainLyrics = null
    store.lines = [
      { timeMs: 0, text: 'First line' },
      { timeMs: 5000, text: 'Second line' },
    ]
    ;(player as any).currentTime = 6

    const { default: LyricsPanel } = await import('../LyricsPanel.vue')
    const wrapper = mount(LyricsPanel)
    const paragraphs = wrapper.findAll('p')
    expect(paragraphs[1]!.classes()).toContain('text-foreground')
    expect(paragraphs[1]!.classes()).toContain('font-semibold')
    expect(paragraphs[0]!.classes()).toContain('text-muted-foreground')
  })
})
