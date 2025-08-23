precision mediump float;
varying vec2 vUv;

uniform sampler2D uInput;
uniform float uScale;
uniform vec2  uOffset;
uniform float uOpacity;

void main() {
  vec2 uv = (vUv - 0.5) * uScale + 0.5 + uOffset;

  vec4 c = vec4(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    c = texture2D(uInput, uv);
  }
  c.a *= uOpacity;
  gl_FragColor = c;
}