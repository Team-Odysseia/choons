import { vi } from 'vitest'

// ─── Audio mock ───────────────────────────────────────────────────────────────
// jsdom não implementa HTMLAudioElement — fornecemos um mock que:
// - expõe play/pause/load como vi.fn()
// - armazena event listeners e permite dispará-los com _emit()
// - sincroniza isPlaying via eventos 'play' e 'pause'

export let audioMock: AudioMock

class AudioMock {
  src = ''
  preload = ''
  currentTime = 0
  duration = 0
  paused = true
  private _volume = 1
  private _listeners: Record<string, Array<() => void>> = {}

  constructor() {
    // Captura a instância mais recente para os testes
    audioMock = this
  }

  get volume() { return this._volume }
  set volume(v: number) { this._volume = v }

  load = vi.fn()

  play = vi.fn().mockImplementation(() => {
    this.paused = false
    this._emit('play')
    return Promise.resolve()
  })

  pause = vi.fn().mockImplementation(() => {
    this.paused = true
    this._emit('pause')
  })

  addEventListener(event: string, fn: () => void) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
  }

  removeEventListener() {}

  _emit(event: string) {
    ;(this._listeners[event] ?? []).forEach((fn) => fn())
  }
}

vi.stubGlobal('Audio', AudioMock)
