precision mediump float;

varying vec2 vUv;

uniform sampler2D uVideo;
uniform vec2  uOutResolution;
uniform float uContentAspect;
uniform float uOpacity;

uniform int   uKeyMode; 
uniform float uKeyLow;
uniform float uKeyHigh;
uniform bool  uPremultiply;

uniform bool  uFlipY;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec4 applyKey(vec4 c) {
  if (uKeyMode == 0) return c;
  float L = luma(c.rgb);
  float a = 1.0;
  if (uKeyMode == 1) {
    a = smoothstep(uKeyLow, uKeyHigh, L);
  } else if (uKeyMode == 2) {
    a = 1.0 - smoothstep(uKeyLow, uKeyHigh, L);
  }
  c.a *= a;
  if (uPremultiply) c.rgb *= c.a;
  return c;
}

void main() {
  float outW   = uOutResolution.x;
  float outH   = uOutResolution.y;
  float drawnH = outW / max(1e-6, uContentAspect);

  vec2 uv = vUv;
  vec4 col;

  if (drawnH >= outH) {
    float visibleFrac = outH / drawnH;
    float v = clamp(uv.y * visibleFrac + (1.0 - visibleFrac), 0.0, 1.0);
    float vSamp = uFlipY ? (1.0 - v) : v;
    col = texture2D(uVideo, vec2(uv.x, vSamp));
  } else {
    float visibleFrac = drawnH / outH;
    if (uv.y < (1.0 - visibleFrac)) {
      gl_FragColor = vec4(0.0);
      return;
    }
    float vLocal = (uv.y - (1.0 - visibleFrac)) / visibleFrac;
    vLocal = clamp(vLocal, 0.0, 1.0);
    float vSamp = uFlipY ? (1.0 - vLocal) : vLocal;
    col = texture2D(uVideo, vec2(uv.x, vSamp));
  }

  col = applyKey(col);
  col.a *= uOpacity;
  gl_FragColor = col;
}