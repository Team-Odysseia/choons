import { ref, onScopeDispose } from 'vue'

let sharedAudio: HTMLAudioElement | undefined

export function useAudioEngine(audioElement?: HTMLAudioElement) {
  const audio = audioElement ?? sharedAudio ?? new Audio()
  if (!sharedAudio && !audioElement) {
    sharedAudio = audio
  }
  audio.preload = 'metadata'

  const currentTime = ref(0)
  const duration = ref(0)
  const isPlaying = ref(false)

  function updateCurrentTime() {
    currentTime.value = audio.currentTime
  }

  function updateDuration() {
    duration.value = audio.duration || 0
  }

  function onPlay() {
    isPlaying.value = true
  }

  function onPause() {
    isPlaying.value = false
  }

  audio.addEventListener('timeupdate', updateCurrentTime)
  audio.addEventListener('durationchange', updateDuration)
  audio.addEventListener('play', onPlay)
  audio.addEventListener('pause', onPause)

  function dispose() {
    audio.removeEventListener('timeupdate', updateCurrentTime)
    audio.removeEventListener('durationchange', updateDuration)
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.pause()
    audio.src = ''
  }

  onScopeDispose(dispose)

  function play() {
    return audio.play().catch(() => {
      isPlaying.value = false
    })
  }

  function pause() {
    audio.pause()
  }

  function seek(time: number) {
    audio.currentTime = time
  }

  function setVolume(vol: number) {
    audio.volume = vol
  }

  function setSrc(src: string) {
    audio.src = src
  }

  function stop() {
    audio.pause()
    audio.src = ''
  }

  function getCurrentTime() {
    return audio.currentTime
  }

  function onEnded(callback: () => void) {
    audio.addEventListener('ended', callback)
    return () => audio.removeEventListener('ended', callback)
  }

  return {
    audio,
    currentTime,
    duration,
    isPlaying,
    play,
    pause,
    seek,
    setVolume,
    setSrc,
    stop,
    getCurrentTime,
    onEnded,
    dispose,
  }
}
