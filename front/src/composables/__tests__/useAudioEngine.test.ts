import { describe, it, expect, vi } from 'vitest'
import { effectScope } from 'vue'
import { audioMock } from '../../../vitest.setup'
import { useAudioEngine } from '../useAudioEngine'

const trackEvent = vi.hoisted(() => vi.fn())
vi.mock('@/lib/telemetry', () => ({ trackEvent }))

function setup(paused: boolean) {
  const audio = new Audio()
  const scope = effectScope()
  const engine = scope.run(() => useAudioEngine(audio))!
  const mock = audioMock
  mock.paused = paused
  return { mock, engine, scope }
}

describe('useAudioEngine', () => {
  it('recarrega a URL de stream e retoma a posicao quando a URL assinada expira', () => {
    const { mock, engine } = setup(false)
    engine.setSrc('http://api.test/stream/abc')
    mock.currentTime = 42
    mock.play.mockClear()

    mock._emit('error')

    expect(mock.src).toBe('http://api.test/stream/abc')
    expect(mock.load).toHaveBeenCalledTimes(1)

    mock.currentTime = 0
    mock._emit('loadedmetadata')
    expect(mock.currentTime).toBe(42)
    expect(mock.play).toHaveBeenCalledTimes(1)
  })

  it('nao retoma a reproducao se estava pausado', () => {
    const { mock, engine } = setup(true)
    engine.setSrc('http://api.test/stream/abc')
    mock.currentTime = 10

    mock._emit('error')
    mock._emit('loadedmetadata')

    expect(mock.load).toHaveBeenCalledTimes(1)
    expect(mock.currentTime).toBe(10)
    expect(mock.play).not.toHaveBeenCalled()
  })

  it('tenta recuperar apenas uma vez ate voltar a tocar', () => {
    const { mock, engine } = setup(false)
    engine.setSrc('http://api.test/stream/abc')

    mock._emit('error')
    mock._emit('error')
    expect(mock.load).toHaveBeenCalledTimes(1)

    mock._emit('playing')
    mock._emit('error')
    expect(mock.load).toHaveBeenCalledTimes(2)
  })

  it('reporta o erro quando a recuperacao tambem falha', () => {
    const { mock, engine } = setup(false)
    engine.setSrc('http://api.test/stream/abc')

    mock._emit('error')
    expect(trackEvent).not.toHaveBeenCalled()

    mock._emit('error')
    expect(trackEvent).toHaveBeenCalledWith(
      'audio_playback_error',
      expect.objectContaining({ src: 'http://api.test/stream/abc' }),
    )
  })

  it('aplica a posicao apenas uma vez por recuperacao', () => {
    const { mock, engine } = setup(true)
    engine.setSrc('http://api.test/stream/abc')
    mock.currentTime = 30
    mock._emit('error')
    mock._emit('loadedmetadata')
    mock.currentTime = 55
    mock._emit('loadedmetadata')
    expect(mock.currentTime).toBe(55)
  })

  it('ignora erros depois de stop ou sem src definido', () => {
    const { mock, engine } = setup(false)
    mock._emit('error')
    engine.setSrc('http://api.test/stream/abc')
    engine.stop()
    mock._emit('error')
    expect(mock.load).not.toHaveBeenCalled()
  })

  it('remove o listener de erro ao descartar o escopo', () => {
    const { mock, engine, scope } = setup(false)
    engine.setSrc('http://api.test/stream/abc')
    scope.stop()
    mock._emit('error')
    expect(mock.load).not.toHaveBeenCalled()
  })
})
