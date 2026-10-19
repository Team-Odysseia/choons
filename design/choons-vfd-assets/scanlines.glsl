precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/** @label Content */
uniform sampler2D u_content;

/**
 * @label Line Spacing
 * @default 3
 * @range 2, 8
 */
uniform float u_spacing;

/**
 * @label Strength
 * @default 0.22
 * @range 0, 1
 */
uniform float u_strength;

/**
 * @label Vignette
 * @default 0.35
 * @range 0, 1
 */
uniform float u_vignette;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec4 c = texture2D(u_content, uv);
  float row = mod(gl_FragCoord.y, u_spacing);
  float line = row < 1.0 ? 1.0 - u_strength : 1.0;
  vec2 d = uv - 0.5;
  float vig = 1.0 - u_vignette * dot(d, d) * 2.0;
  gl_FragColor = vec4(c.rgb * line * vig, c.a);
}
