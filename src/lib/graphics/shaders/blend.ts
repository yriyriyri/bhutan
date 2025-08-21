export const BLEND_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uBase;
  uniform sampler2D uTop;
  uniform float uOpacity;
  uniform int uMode; // 0=normal  1=add  2=multiply  3=screen

  vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
  vec3 toSRGB(vec3 c)   { return pow(c, vec3(1.0/2.2)); }

  vec3 blendAdd(vec3 b, vec3 t){ return b + t; }
  vec3 blendMultiply(vec3 b, vec3 t){ return b * t; }
  vec3 blendScreen(vec3 b, vec3 t){ return 1.0 - (1.0 - b) * (1.0 - t); }

  void main() {
    vec4 base = texture2D(uBase, vUv);
    vec4 top  = texture2D(uTop,  vUv);

    vec3 bLin = toLinear(base.rgb);
    vec3 tLin = toLinear(top.rgb);

    vec3 blended;
    if (uMode == 1)      blended = blendAdd(bLin, tLin);
    else if (uMode == 2) blended = blendMultiply(bLin, tLin);
    else if (uMode == 3) blended = blendScreen(bLin, tLin);
    else                 blended = tLin; // normal uses the "top" color

    float a = clamp(top.a * uOpacity, 0.0, 1.0);

    // Straight-alpha OVER in linear
    vec3 outLin = mix(bLin, blended, a);
    float outA  = base.a + a * (1.0 - base.a);

    // Back to sRGB-ish output
    gl_FragColor = vec4(toSRGB(outLin), outA);
  }
`;