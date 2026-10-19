function hash(seed: number, index: number) {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function simulateLevels(
  timeMs: number,
  bars: number,
  segments: number,
  seed: number,
  energy: number,
): number[] {
  const seconds = timeMs / 1000
  const levels: number[] = []
  for (let b = 0; b < bars; b++) {
    const t = bars > 1 ? b / (bars - 1) : 0
    const curve = 0.55 + 0.45 * Math.sin(t * Math.PI * 1.2 + 0.4)
    const speed = 2 + hash(seed, b) * 4
    const phase = hash(seed + 1, b) * Math.PI * 2
    const wobble = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(seconds * speed + phase))
    const level = Math.round(segments * energy * curve * wobble)
    levels.push(Math.max(0, Math.min(segments, level)))
  }
  return levels
}
