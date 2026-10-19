precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/**
 * @label Pitch
 * @default 4
 * @range 2, 16
 */
uniform float u_pitch;

/**
 * @label Dot Radius
 * @default 0.9
 * @range 0.2, 4
 */
uniform float u_radius;

/**
 * @label Dot Color
 * @color
 * @default #5CF6E8
 */
uniform vec3 u_dot;

/**
 * @label Dot Opacity
 * @default 0.07
 * @range 0, 1
 */
uniform float u_alpha;

/**
 * @label Background
 * @color
 * @default #05090B
 */
uniform vec3 u_bg;

void main() {
  vec2 cell = mod(gl_FragCoord.xy, u_pitch) - u_pitch * 0.5;
  float d = length(cell);
  float dot = 1.0 - smoothstep(u_radius - 0.5, u_radius + 0.5, d);
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float glowBand = 0.04 * (1.0 - abs(uv.y - 0.5) * 2.0);
  vec3 col = u_bg + u_dot * glowBand * 0.25;
  col = mix(col, u_dot, dot * u_alpha);
  gl_FragColor = vec4(col, 1.0);
}
