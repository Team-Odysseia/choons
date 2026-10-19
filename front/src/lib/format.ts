export function formatDuration(secs: number) {
  if (!secs || Number.isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function totalMinutes(tracks: { durationSeconds: number }[]) {
  return Math.round(tracks.reduce((sum, t) => sum + t.durationSeconds, 0) / 60)
}
