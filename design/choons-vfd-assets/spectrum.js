/**
 * @schema 2.11
 * @input bars: number = 24
 * @input segments: number = 12
 * @input gap: number = 3
 * @input seed: number = 1
 * @input energy: number = 0.7
 * @input lit: color = #5CF6E8
 * @input hot: color = #FF4FD8
 * @input ghost: color = #5CF6E81A
 * @input peaks: boolean = true
 */
const { bars, segments, gap, seed, energy, lit, hot, ghost, peaks } = pencil.input;
const n = Math.max(1, Math.floor(bars));
const s = Math.max(2, Math.floor(segments));
const barW = (pencil.width - gap * (n - 1)) / n;
const segH = (pencil.height - gap * (s - 1)) / s;

let state = Math.floor(seed * 9973) % 2147483647 || 1;
const rand = () => {
  state = (state * 16807) % 2147483647;
  return (state - 1) / 2147483646;
};

const nodes = [];
for (let b = 0; b < n; b++) {
  const t = b / Math.max(1, n - 1);
  const curve = 0.55 + 0.45 * Math.sin(t * Math.PI * 1.2 + 0.4);
  const level = Math.max(1, Math.min(s, Math.round(s * energy * (0.35 + 0.65 * rand()) * curve + rand() * 2)));
  const peak = Math.min(s - 1, level + 1 + Math.floor(rand() * 2));
  for (let i = 0; i < s; i++) {
    const on = i < level;
    const isPeak = peaks && i === peak;
    const hotZone = i >= s - 2;
    nodes.push({
      type: "rectangle",
      name: `b${b}s${i}`,
      x: b * (barW + gap),
      y: pencil.height - (i + 1) * segH - i * gap,
      width: barW,
      height: segH,
      cornerRadius: 1,
      fill: on || isPeak ? (hotZone ? hot : lit) : ghost,
      opacity: isPeak && !on ? 0.75 : 1,
      effect: on || isPeak
        ? { type: "shadow", shadowType: "outer", offset: { x: 0, y: 0 }, blur: 6, color: (hotZone ? hot : lit) + "88" }
        : undefined,
    });
  }
}
return nodes;
