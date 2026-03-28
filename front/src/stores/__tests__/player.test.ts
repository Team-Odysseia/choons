import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from '../player'
import { audioMock } from '../../../vitest.setup'
import type { TrackResponse } from '@/api/types'

const { recordStreamMock } = vi.hoisted(() => ({
  recordStreamMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/tracks', () => ({
  streamUrl: vi.fn((id: string) => `http://test/stream/${id}`),
  recordStream: recordStreamMock,
}))

function makeTrack(n: number): TrackResponse {
  return {
    id: `track-${n}`,
    title: `Track ${n}`,
    album: { id: 'album-1', title: 'Album', artist: { id: 'art-1', name: 'Artist', bio: '', createdAt: '' }, releaseYear: 2024, createdAt: '' },
    artist: { id: 'art-1', name: 'Artist', bio: '', createdAt: '' },
    trackNumber: n,
    durationSeconds: 180,
    createdAt: '',
  }
}

const t1 = makeTrack(1)
const t2 = makeTrack(2)
const t3 = makeTrack(3)

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  recordStreamMock.mockClear()
})

// ─── playTrack ────────────────────────────────────────────────────────────────

describe('playTrack', () => {
  it('define currentTrack e chama load + play', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    expect(store.currentTrack).toEqual(t1)
    expect(audioMock.load).toHaveBeenCalled()
    expect(audioMock.play).toHaveBeenCalled()
  })

  it('seta src do áudio com a URL correta', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    expect(audioMock.src).toBe(`http://test/stream/${t1.id}`)
  })

  it('com queue, popula a fila e o índice correto', () => {
    const store = usePlayerStore()
    store.playTrack(t2, [t1, t2, t3], 1)
    expect(store.queue).toEqual([t1, t2, t3])
    expect(store.currentIndex).toBe(1)
  })

  it('isPlaying fica true após play via evento', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    expect(store.isPlaying).toBe(true)
  })
})

// ─── playQueue ────────────────────────────────────────────────────────────────

describe('playQueue', () => {
  it('toca o track no startIndex informado', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 1)
    expect(store.currentTrack).toEqual(t2)
    expect(store.currentIndex).toBe(1)
  })

  it('startIndex padrão é 0', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3])
    expect(store.currentTrack).toEqual(t1)
  })

  it('não faz nada se a lista estiver vazia', () => {
    const store = usePlayerStore()
    store.playQueue([])
    expect(store.currentTrack).toBeNull()
  })
})

// ─── playNext ─────────────────────────────────────────────────────────────────

describe('playNext', () => {
  it('avança para o próximo track', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 0)
    store.playNext()
    expect(store.currentTrack).toEqual(t2)
    expect(store.currentIndex).toBe(1)
  })

  it('no último track com loop:none, não faz nada', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2], 1)
    store.playNext()
    expect(store.currentTrack).toEqual(t2) // permanece no mesmo
  })

  it('no último track com loop:queue, vai para o primeiro', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 2)
    store.loopMode = 'queue'
    store.playNext()
    expect(store.currentTrack).toEqual(t1)
    expect(store.currentIndex).toBe(0)
  })
})

// ─── playPrev ─────────────────────────────────────────────────────────────────

describe('playPrev', () => {
  it('volta para o track anterior', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 2)
    store.playPrev()
    expect(store.currentTrack).toEqual(t2)
    expect(store.currentIndex).toBe(1)
  })

  it('no primeiro track com loop:none, não faz nada', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2], 0)
    store.playPrev()
    expect(store.currentTrack).toEqual(t1)
  })

  it('no primeiro track com loop:queue, vai para o último', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 0)
    store.loopMode = 'queue'
    store.playPrev()
    expect(store.currentTrack).toEqual(t3)
  })

  it('quando currentTime > 3, reinicia o tempo em vez de trocar de track', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2], 1)
    audioMock.currentTime = 10
    store.playPrev()
    expect(audioMock.currentTime).toBe(0)
    expect(store.currentTrack).toEqual(t2) // track não mudou
  })
})

// ─── togglePlay ───────────────────────────────────────────────────────────────

describe('togglePlay', () => {
  it('retoma a reprodução quando pausado', () => {
    const store = usePlayerStore()
    store.playQueue([t1])
    audioMock.pause() // pausa manualmente
    store.togglePlay()
    expect(audioMock.play).toHaveBeenCalledTimes(2) // play inicial + togglePlay
  })

  it('pausa quando tocando', () => {
    const store = usePlayerStore()
    store.playQueue([t1]) // inicia tocando
    store.togglePlay()
    expect(audioMock.pause).toHaveBeenCalled()
  })
})

// ─── seek ─────────────────────────────────────────────────────────────────────

describe('seek', () => {
  it('atualiza currentTime do elemento de áudio', () => {
    const store = usePlayerStore()
    store.seek(42)
    expect(audioMock.currentTime).toBe(42)
  })
})

// ─── setVolume ────────────────────────────────────────────────────────────────

describe('setVolume', () => {
  it('atualiza volume no store e no áudio', () => {
    const store = usePlayerStore()
    store.setVolume(0.5)
    expect(store.volume).toBe(0.5)
    expect(audioMock.volume).toBe(0.5)
  })

  it('persiste o volume no localStorage', () => {
    const store = usePlayerStore()
    store.setVolume(0.3)
    expect(localStorage.getItem('volume')).toBe('0.3')
  })

  it('restaura volume do localStorage na inicialização', () => {
    localStorage.setItem('volume', '0.7')
    const store = usePlayerStore()
    expect(store.volume).toBe(0.7)
  })
})

// ─── cycleLoop ────────────────────────────────────────────────────────────────

describe('cycleLoop', () => {
  it('cicla: none → queue → track → none', () => {
    const store = usePlayerStore()
    expect(store.loopMode).toBe('none')
    store.cycleLoop()
    expect(store.loopMode).toBe('queue')
    store.cycleLoop()
    expect(store.loopMode).toBe('track')
    store.cycleLoop()
    expect(store.loopMode).toBe('none')
  })
})

// ─── toggleShuffle ────────────────────────────────────────────────────────────

describe('toggleShuffle', () => {
  it('ao ativar, coloca o track atual na posição 0 da fila', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 1) // t2 está tocando
    store.toggleShuffle()
    expect(store.isShuffled).toBe(true)
    expect(store.queue[0]).toEqual(t2)
    expect(store.currentIndex).toBe(0)
  })

  it('ao desativar, restaura a fila original com índice correto', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 0)
    store.toggleShuffle()  // ativa
    store.toggleShuffle()  // desativa
    expect(store.isShuffled).toBe(false)
    expect(store.queue).toEqual([t1, t2, t3])
    expect(store.currentIndex).toBe(0)
  })
})

// ─── addToQueue ───────────────────────────────────────────────────────────────

describe('addToQueue', () => {
  it('adiciona o track ao final da fila', () => {
    const store = usePlayerStore()
    store.playQueue([t1])
    store.addToQueue(t2)
    expect(store.queue).toEqual([t1, t2])
  })
})

// ─── stream tracking ──────────────────────────────────────────────────────────

describe('stream tracking', () => {
  it('records stream when currentTime reaches min(30, duration*0.5)', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    audioMock.duration = 60
    ;(store as any).duration = 60
    audioMock.currentTime = 30
    audioMock._emit('timeupdate')
    expect(recordStreamMock).toHaveBeenCalledWith(t1.id)
  })

  it('records stream early for short tracks (50% threshold)', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    audioMock.duration = 20
    ;(store as any).duration = 20
    audioMock.currentTime = 10
    audioMock._emit('timeupdate')
    expect(recordStreamMock).toHaveBeenCalledWith(t1.id)
  })

  it('only records once per play session', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    audioMock.duration = 60
    ;(store as any).duration = 60
    audioMock.currentTime = 30
    audioMock._emit('timeupdate')
    audioMock.currentTime = 35
    audioMock._emit('timeupdate')
    expect(recordStreamMock).toHaveBeenCalledTimes(1)
  })

  it('resets and records again when a new track starts', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    audioMock.duration = 60
    ;(store as any).duration = 60
    audioMock.currentTime = 30
    audioMock._emit('timeupdate')

    store.playTrack(t2)
    audioMock.currentTime = 30
    audioMock._emit('timeupdate')
    expect(recordStreamMock).toHaveBeenCalledTimes(2)
  })

  it('does not record before threshold', () => {
    const store = usePlayerStore()
    store.playTrack(t1)
    audioMock.duration = 60
    ;(store as any).duration = 60
    audioMock.currentTime = 10
    audioMock._emit('timeupdate')
    expect(recordStreamMock).not.toHaveBeenCalled()
  })
})

// ─── stop ─────────────────────────────────────────────────────────────────────

describe('stop', () => {
  it('pausa o áudio e reseta currentTrack, fila e índice', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 1)
    store.stop()
    expect(audioMock.pause).toHaveBeenCalled()
    expect(store.currentTrack).toBeNull()
    expect(store.queue).toEqual([])
    expect(store.currentIndex).toBe(-1)
    expect(store.isPlaying).toBe(false)
  })
})

// ─── evento ended ─────────────────────────────────────────────────────────────

describe('evento ended', () => {
  it('com loop:track, reinicia o áudio', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2])
    store.loopMode = 'track'
    audioMock.currentTime = 90
    audioMock._emit('ended')
    expect(audioMock.currentTime).toBe(0)
    expect(audioMock.play).toHaveBeenCalled()
  })

  it('com loop:none e próximo disponível, avança', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2, t3], 0)
    audioMock._emit('ended')
    expect(store.currentTrack).toEqual(t2)
  })

  it('com loop:none no último track, não avança', () => {
    const store = usePlayerStore()
    store.playQueue([t1, t2], 1)
    audioMock._emit('ended')
    expect(store.currentTrack).toEqual(t2)
  })
})
