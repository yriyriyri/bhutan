// uKeyMode: 0 = off   1 = black key (black  -- transparent)   2 = white key (white -- transparent)
varying vec2 vUv;
uniform sampler2D uVideo;
uniform vec2  uUVScale;
uniform vec2  uUVOffset;
uniform float uOpacity;

uniform int   uKeyMode;
uniform float uKeyLow;
uniform float uKeyHigh;
uniform bool  uPremultiply;

float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main(){
  vec2 uv = clamp(uUVOffset + vUv * uUVScale, 0.0, 1.0);
  vec4 c = texture2D(uVideo, uv);

  float a = 1.0;

  if (uKeyMode == 1) {
    // black key
    float Y = luma(c.rgb);
    a = smoothstep(uKeyLow, uKeyHigh, Y);
  } else if (uKeyMode == 2) {
    // white key
    float Y = luma(c.rgb);
    a = 1.0 - smoothstep(uKeyLow, uKeyHigh, Y);
  }

  a *= uOpacity;

  if (uPremultiply) {
    gl_FragColor = vec4(c.rgb * a, a);
  } else {
    gl_FragColor = vec4(c.rgb, a);
  }
}
