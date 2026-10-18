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

  let requestedSrc = ''
  let recovering = false

  function onError() {
    if (!requestedSrc || recovering) return
    recovering = true
    const resumeAt = audio.currentTime
    const resume = !audio.paused || isPlaying.value
    audio.addEventListener(
      'loadedmetadata',
      () => {
        audio.currentTime = resumeAt
        if (resume) void play()
      },
      { once: true },
    )
    audio.src = requestedSrc
    audio.load()
  }

  function onPlaying() {
    recovering = false
  }

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
  audio.addEventListener('error', onError)
  audio.addEventListener('playing', onPlaying)

  function dispose() {
    audio.removeEventListener('timeupdate', updateCurrentTime)
    audio.removeEventListener('durationchange', updateDuration)
    audio.removeEventListener('play', onPlay)
    audio.removeEventListener('pause', onPause)
    audio.removeEventListener('error', onError)
    audio.removeEventListener('playing', onPlaying)
    requestedSrc = ''
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
    requestedSrc = src
    recovering = false
    audio.src = src
  }

  function stop() {
    requestedSrc = ''
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
