import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { mockMatchMedia } from '@/test-utils/matchMedia'
import MusicPlayer from '../MusicPlayer.vue'
import { usePlayerStore } from '@/stores/player'
import { usePartyStore } from '@/stores/party'
import type { PartyStateResponse, TrackResponse } from '@/api/types'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('vue-sonner', () => ({ toast: { error: toastError, success: vi.fn(), info: vi.fn() } }))

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
    const playBtn = wrapper.find('[data-testid="play-btn"]')
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

    const playBtn = wrapper.find('[data-testid="play-btn"]')
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

    const playBtn = wrapper.find('[data-testid="play-btn"]')
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
    const progressInput = wrapper.find('[data-testid="progress-range"] [role="slider"]')
    expect(progressInput.attributes('aria-label')).toBe('Progress')
  })

  it('volume range has aria-label', () => {
    const { wrapper } = mountPlayer()
    const volumeInput = wrapper.find('[data-testid="volume-range"] [role="slider"]')
    expect(volumeInput.attributes('aria-label')).toBe('Volume')
  })
})

// ─── Barra de progresso ───────────────────────────────────────────────────────

describe('barra de progresso', () => {
  it('valor reflete progressPercent calculado', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTime: 60, duration: 240 })
    await wrapper.vm.$nextTick()

    const progressInput = wrapper.find('[data-testid="progress-range"] [role="slider"]')
    expect(Number(progressInput.attributes('aria-valuenow'))).toBeCloseTo(25)
  })

  it('input dispara seek com tempo correto', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ duration: 200 })
    vi.spyOn(player, 'seek')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="progress-range"] [role="slider"]').trigger('keydown', { key: 'End' })

    expect(player.seek).toHaveBeenCalledWith(200)
  })
})

// ─── Volume ───────────────────────────────────────────────────────────────────

describe('volume', () => {
  it('input de volume dispara setVolume', async () => {
    const { wrapper, player } = mountPlayer()
    vi.spyOn(player, 'setVolume')
    await wrapper.vm.$nextTick()

    player.$patch({ volume: 0.5 })
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="volume-range"] [role="slider"]').trigger('keydown', { key: 'ArrowUp' })

    expect(player.setVolume).toHaveBeenCalledWith(0.51)
  })

  it('exibe percentual correto de volume', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ volume: 0.7 })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="volume-range"]').text()).toContain('70')
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
    expect(shuffleBtn.classes()).toContain('text-cyan')
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
    expect(loopBtn.classes()).toContain('text-cyan')
  })
})

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime (via template)', () => {
  it('exibe "0:00" quando não há track', () => {
    const { wrapper } = mountPlayer()
    // Dois spans de tempo: currentTime e duration
    expect(wrapper.find('[data-testid="elapsed"]').text()).toBe('0:00')
    expect(wrapper.find('[data-testid="total"]').text()).toBe('0:00')
  })

  it('formata minutos e segundos corretamente', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTime: 125, duration: 240 }) // 2:05 / 4:00
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="elapsed"]').text()).toBe('2:05')
    expect(wrapper.find('[data-testid="total"]').text()).toBe('4:00')
  })
})

// ─── Party mode ───────────────────────────────────────────────────────────────

describe('party mode', () => {
  function partyState(): PartyStateResponse {
    return {
      id: 'p-1',
      revision: 1,
      inviteCode: 'ABC123',
      name: 'Party',
      queuePolicy: 'DJ_ONLY',
      hostUserId: 'u-host',
      members: [
        { userId: 'u-host', username: 'host', host: true, dj: true, connected: true },
        { userId: 'u-member', username: 'member', host: false, dj: false, connected: true },
      ],
      queue: [{ id: 'item-1', position: 0, track: mockTrack, addedByUserId: 'u-host', addedByUsername: 'host' }],
      playback: { track: mockTrack, queueItemId: 'item-1', playing: false, anchorPositionSec: 0, anchorEpochMs: 0 },
    }
  }

  async function mountInParty(userId: string) {
    const mounted = mountPlayer()
    const party = usePartyStore()
    party.setCurrentUserId(userId)
    party.state = partyState()
    mounted.player.$patch({ currentTrack: mockTrack, queue: [mockTrack], currentIndex: 0 })
    await mounted.wrapper.vm.$nextTick()
    return { ...mounted, party }
  }

  it('resumes the playing queue item through the party', async () => {
    const { wrapper, party } = await mountInParty('u-host')
    const play = vi.spyOn(party, 'play').mockResolvedValue(true)

    await wrapper.find('[data-testid="play-btn"]').trigger('click')

    expect(play).toHaveBeenCalledWith('track-1', 0, 'item-1')
  })

  it('keeps next and prev enabled on the last party item', async () => {
    const { wrapper, party } = await mountInParty('u-host')
    const next = vi.spyOn(party, 'next').mockResolvedValue(true)
    const prev = vi.spyOn(party, 'prev').mockResolvedValue(true)

    await wrapper.find('[data-testid="next-btn"]').trigger('click')
    await wrapper.find('[data-testid="prev-btn"]').trigger('click')

    expect(next).toHaveBeenCalled()
    expect(prev).toHaveBeenCalled()
  })

  it('disables controls for members without DJ rights', async () => {
    const { wrapper, party } = await mountInParty('u-member')
    const play = vi.spyOn(party, 'play')

    expect(wrapper.find('[data-testid="next-btn"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="play-btn"]').attributes('disabled')).toBeDefined()
    expect(play).not.toHaveBeenCalled()
  })

  it('routes seeking through the party', async () => {
    const { wrapper, party, player } = await mountInParty('u-host')
    const seek = vi.spyOn(party, 'seek').mockResolvedValue(true)
    player.$patch({ duration: 200 })
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="progress-range"] [role="slider"]').trigger('keydown', { key: 'End' })

    expect(seek).toHaveBeenCalledWith(200)
  })

  it('party non-controller seek slider is disabled', async () => {
    const { wrapper } = await mountInParty('u-member')
    expect(wrapper.find('[data-testid="progress-range"] [role="slider"]').attributes('data-disabled')).toBeDefined()
  })

  it('lights the PARTY flag in a party', async () => {
    const { wrapper } = await mountInParty('u-host')
    expect(wrapper.find('[data-flag="PARTY"]').attributes('data-on')).toBeDefined()
  })
})

describe('head unit display', () => {
  it('shows NO DISC when no track', () => {
    const { wrapper } = mountPlayer()
    expect(wrapper.find('[data-testid="no-disc"]').text()).toBe('NO DISC')
    expect(wrapper.find('[data-testid="no-disc"]').attributes('aria-hidden')).toBe('true')
  })

  it('track readout shows queue position', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack, queue: [mockTrack, { ...mockTrack, id: 't2' }, { ...mockTrack, id: 't3' }], currentIndex: 2 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="track-readout"]').text()).toContain('03')
  })

  it('level readout follows the volume', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ volume: 0.5 })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="level-readout"]').text()).toContain('-6dB')
  })

  it('knob ArrowUp calls setVolume', async () => {
    const { wrapper, player } = mountPlayer()
    vi.spyOn(player, 'setVolume')
    player.$patch({ volume: 0.2 })
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="volume-range"] [role="slider"]').trigger('keydown', { key: 'ArrowUp' })
    expect(player.setVolume).toHaveBeenCalledWith(0.21)
  })

  it('marquee shows title, artist and album', async () => {
    const { wrapper, player } = mountPlayer()
    player.$patch({ currentTrack: mockTrack })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Test Song · Test Artist · Test Album')
  })
})

describe('responsive transport', () => {
  afterEach(() => mockMatchMedia(() => false))

  it('uses compact transport keys on phones', () => {
    mockMatchMedia(() => false)
    const { wrapper } = mountPlayer()
    expect(wrapper.find('[data-testid="play-btn"]').attributes('style')).toContain('width: 48px')
    expect(wrapper.find('[data-testid="prev-btn"]').attributes('style')).toContain('width: 34px')
  })

  it('uses full-size transport keys on desktop', async () => {
    mockMatchMedia((q) => q.includes('min-width: 768px'))
    const { wrapper } = mountPlayer()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-testid="play-btn"]').attributes('style')).toContain('width: 60px')
    expect(wrapper.find('[data-testid="prev-btn"]').attributes('style')).toContain('width: 40px')
  })
})
