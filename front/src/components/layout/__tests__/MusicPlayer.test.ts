import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MusicPlayer from '../MusicPlayer.vue'
import { usePlayerStore } from '@/stores/player'
import type { TrackResponse } from '@/api/types'

vi.mock('@/api/tracks', () => ({
  streamUrl: vi.fn((id: string) => `http://test/stream/${id}`),
}))

// Lucide icons renderizam SVGs — stub global para simplificar snapshots
const IconStub = { template: '<svg />' }

const mockTrack: TrackResponse = {
  id: 'track-1',
  title: 'Test Song',
  album: {
    id: 'album-1',
    title: 'Test Album',
    artist: { id: 'art-1', name: 'Test Artist', bio: '', createdAt: '', avatarUrl: null },
    releaseYear: 2024,
    createdAt: '',
    coverUrl: null,
  },
  artist: { id: 'art-1', name: 'Test Artist', bio: '', createdAt: '', avatarUrl: null },
  trackNumber: 1,
  durationSeconds: 240,
  createdAt: '',
  hifi: false,
  lrclibId: null,
}

function mountPlayer() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(MusicPlayer, {
    global: {
      plugins: [pinia],
      stubs: {
        Shuffle: IconStub,
        SkipBack: IconStub,
        Play: IconStub,
        Pause: IconStub,
        SkipForward: IconStub,
        Repeat: IconStub,
        Repeat1: IconStub,
        Volume2: IconStub,
      },
    },
  })

  return { wrapper, player: usePlayerStore() }
}

// ─── Estado sem track ─────────────────────────────────────────────────────────

describe('sem track ativo', () => {
  it('exibe "No track selected"', () => {
    const { wrapper } = mountPlayer()
    expect(wrapper.text()).toContain('No track selected')
  })

  it('botão play/pause está desabilitado', () => {
    const { wrapper } = mountPlayer()
    // Botão central (Play/Pause) tem :disabled="!player.currentTrack"
    const playBtn = wrapper.findAll('button').find((b) =>
      b.classes().includes('rounded-full') && b.classes().includes('bg-foreground'),
    )
    expect(playBtn?.attributes('disabled')).toBeDefined()
  })
})

// ─── Estado com track ─────────────────────────────────────────────────────────

describe('com track ativo', () => {
  it('exibe título do track', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Test Song')
  })

  it('exibe nome do artista', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Test Artist')
  })

  it('botão play/pause fica habilitado', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack })
    await wrapper.vm.$nextTick()

    const playBtn = wrapper.findAll('button').find((b) =>
      b.classes().includes('rounded-full') && b.classes().includes('bg-foreground'),
    )
    expect(playBtn?.attributes('disabled')).toBeUndefined()
  })
})

// ─── Controles de reprodução ──────────────────────────────────────────────────

describe('controles de reprodução', () => {
  it('clique no play/pause chama togglePlay', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack })
    vi.spyOn(player, 'togglePlay')
    await wrapper.vm.$nextTick()

    const playBtn = wrapper.findAll('button').find((b) =>
      b.classes().includes('rounded-full') && b.classes().includes('bg-foreground'),
    )
    await playBtn?.trigger('click')
    expect(player.togglePlay).toHaveBeenCalled()
  })

  it('clique em next chama playNext', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack, queue: [mockTrack, { ...mockTrack, id: 'track-2' }], currentIndex: 0 })
    vi.spyOn(player, 'playNext')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="next-btn"]').trigger('click')
    expect(player.playNext).toHaveBeenCalled()
  })

  it('clique em prev chama playPrev', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({
      currentTrack: mockTrack,
      queue: [{ ...mockTrack, id: 'track-0' }, mockTrack],
      currentIndex: 1,
    })
    vi.spyOn(player, 'playPrev')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="prev-btn"]').trigger('click')
    expect(player.playPrev).toHaveBeenCalled()
  })
})

// ─── Acessibilidade ───────────────────────────────────────────────────────────

describe('accessibility', () => {
  it('progress range has aria-label', () => {
    const { wrapper } = mountPlayer()
    const progressInput = wrapper.find('[data-testid="progress-range"]')
    expect(progressInput.attributes('aria-label')).toBeDefined()
  })

  it('volume range has aria-label', () => {
    const { wrapper } = mountPlayer()
    const volumeInput = wrapper.find('[data-testid="volume-range"]')
    expect(volumeInput.attributes('aria-label')).toBeDefined()
  })
})

// ─── Barra de progresso ───────────────────────────────────────────────────────

describe('barra de progresso', () => {
  it('valor reflete progressPercent calculado', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTime: 60, duration: 240 })
    await wrapper.vm.$nextTick()

    // input[type=range] da barra de progresso (primeiro range input)
    const progressInput = wrapper.find('[data-testid="progress-range"]')
    expect(Number((progressInput.element as HTMLInputElement).value)).toBeCloseTo(25) // 60/240 * 100
  })

  it('input dispara seek com tempo correto', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ duration: 200 })
    vi.spyOn(player, 'seek')
    await wrapper.vm.$nextTick()

    const progressInput = wrapper.find('[data-testid="progress-range"]')
    await progressInput.setValue('50')
    await progressInput.trigger('input')

    // seek(50% * 200) = seek(100)
    expect(player.seek).toHaveBeenCalledWith(100)
  })
})

// ─── Volume ───────────────────────────────────────────────────────────────────

describe('volume', () => {
  it('input de volume dispara setVolume', async () => {
    const { wrapper, player } = mountPlayer()
    vi.spyOn(player, 'setVolume')
    await wrapper.vm.$nextTick()

    const volumeInput = wrapper.find('[data-testid="volume-range"]')
    await volumeInput.setValue('0.5')
    await volumeInput.trigger('input')

    expect(player.setVolume).toHaveBeenCalledWith(0.5)
  })

  it('exibe percentual correto de volume', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ volume: 0.7 })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('70%')
  })
})

// ─── Shuffle ──────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  it('clique no botão shuffle chama toggleShuffle', async () => {
    const { wrapper, player } = mountPlayer()
    vi.spyOn(player, 'toggleShuffle')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="shuffle-btn"]').trigger('click')
    expect(player.toggleShuffle).toHaveBeenCalled()
  })

  it('botão shuffle tem classe text-primary quando isShuffled=true', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ isShuffled: true })
    await wrapper.vm.$nextTick()

    const shuffleBtn = wrapper.find('[data-testid="shuffle-btn"]')
    expect(shuffleBtn.classes()).toContain('text-primary')
  })
})

// ─── Loop ─────────────────────────────────────────────────────────────────────

describe('loop', () => {
  it('clique no botão loop chama cycleLoop', async () => {
    const { wrapper, player } = mountPlayer()
    vi.spyOn(player, 'cycleLoop')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="loop-btn"]').trigger('click')
    expect(player.cycleLoop).toHaveBeenCalled()
  })

  it('botão loop tem classe text-primary quando loopMode≠none', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ loopMode: 'queue' })
    await wrapper.vm.$nextTick()

    const loopBtn = wrapper.find('[data-testid="loop-btn"]')
    expect(loopBtn.classes()).toContain('text-primary')
  })
})

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime (via template)', () => {
  it('exibe "0:00" quando não há track', () => {
    const { wrapper } = mountPlayer()
    // Dois spans de tempo: currentTime e duration
    const timeSpans = wrapper.findAll('span.text-\\[11px\\]')
    expect(timeSpans[0]?.text()).toBe('0:00')
    expect(timeSpans[1]?.text()).toBe('0:00')
  })

  it('formata minutos e segundos corretamente', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTime: 125, duration: 240 }) // 2:05 / 4:00
    await wrapper.vm.$nextTick()

    const timeSpans = wrapper.findAll('span.text-\\[11px\\]')
    expect(timeSpans[0]?.text()).toBe('2:05')
    expect(timeSpans[1]?.text()).toBe('4:00')
  })
})
