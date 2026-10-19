/**
 * @schema 2.11
 * @input count: number = 48
 * @input value: number = 0.4
 * @input gap: number = 2
 * @input lit: color = #5CF6E8
 * @input ghost: color = #5CF6E81A
 * @input head: boolean = true
 */
const { count, value, gap, lit, ghost, head } = pencil.input;
const n = Math.max(1, Math.floor(count));
const w = (pencil.width - gap * (n - 1)) / n;
const litCount = Math.round(n * Math.max(0, Math.min(1, value)));

const nodes = [];
for (let i = 0; i < n; i++) {
  const on = i < litCount;
  const isHead = head && i === litCount - 1;
  nodes.push({
    type: "rectangle",
    name: `seg${i}`,
    x: i * (w + gap),
    y: isHead ? 0 : pencil.height * 0.2,
    width: w,
    height: isHead ? pencil.height : pencil.height * 0.6,
    cornerRadius: 1,
    fill: on ? lit : ghost,
    effect: on
      ? { type: "shadow", shadowType: "outer", offset: { x: 0, y: 0 }, blur: isHead ? 10 : 5, color: lit + "99" }
      : undefined,
  });
}
return nodes;
