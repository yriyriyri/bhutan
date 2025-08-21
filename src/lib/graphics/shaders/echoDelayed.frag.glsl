varying vec2 vUv;

uniform sampler2D uNow;

// delayed 3
uniform sampler2D u3A; uniform sampler2D u3B; uniform float u3t; uniform float u3w; uniform float u3s;
// delayed 2
uniform sampler2D u2A; uniform sampler2D u2B; uniform float u2t; uniform float u2w; uniform float u2s;
// delayed 1
uniform sampler2D u1A; uniform sampler2D u1B; uniform float u1t; uniform float u1w; uniform float u1s;

uniform bool uUseLumaAlpha;
uniform bool uForceOpaque;

uniform vec2 uCenter;

float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float alphaFor(vec4 c, bool useLuma){
  return useLuma ? max(c.a, luma(c.rgb)) : c.a;
}

vec4 over(vec4 dst, vec4 src, bool useLuma){
  float sa = alphaFor(src, useLuma);
  vec3  rgb = src.rgb + (1.0 - sa) * dst.rgb;
  float a   = sa      + (1.0 - sa) * dst.a;
  return vec4(rgb, a);
}

vec3 brightenToWhite(vec3 c, float w){
  w = clamp(w, 0.0, 1.0);
  return mix(c, vec3(1.0), w);
}

vec4 sampleScaled(sampler2D tex, float scale){
  float s = max(scale, 1e-6);
  vec2 uv = (vUv - uCenter) / s + uCenter;

  vec2 in0 = step(vec2(0.0), uv);
  vec2 in1 = step(uv, vec2(1.0));
  float inside = in0.x * in0.y * in1.x * in1.y;

  vec4 c = texture2D(tex, uv);
  return c * inside;
}

void main(){
  vec4 acc = vec4(0.0);

  vec4 d3 = mix(sampleScaled(u3A, u3s), sampleScaled(u3B, u3s), u3t);
  d3.rgb = brightenToWhite(d3.rgb, u3w);

  vec4 d2 = mix(sampleScaled(u2A, u2s), sampleScaled(u2B, u2s), u2t);
  d2.rgb = brightenToWhite(d2.rgb, u2w);

  vec4 d1 = mix(sampleScaled(u1A, u1s), sampleScaled(u1B, u1s), u1t);
  d1.rgb = brightenToWhite(d1.rgb, u1w);

  vec4 now = texture2D(uNow, vUv);

  // back to front
  acc = over(acc, d3, uUseLumaAlpha);
  acc = over(acc, d2, uUseLumaAlpha);
  acc = over(acc, d1, uUseLumaAlpha);
  acc = over(acc, now, false);

  if (uForceOpaque) acc.a = 1.0;
  gl_FragColor = acc;
}
