// lib/graphics/shaders/finalAscii.ts
export const ASCII_FINAL_FRAG = /* glsl */`
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying vec2 vUv;

  uniform sampler2D uInput;       // composited RGBA (alpha carries your luma-key)
  uniform vec2  uResolution;
  uniform float uTime;

  // ASCII uniforms
  uniform sampler2D uAtlas;
  uniform vec2  uAtlasGrid;       // (cols, rows)
  uniform float uCharCount;
  uniform vec2  uCellPx;          // (cellW, cellH) in px

  uniform bool  uUseColor;
  uniform vec3  uTextColor;

  // Background control
  uniform bool  uDrawBackground;  // if false → no background, only glyph ink
  uniform vec3  uBgColor;

  // Alpha gating
  uniform float uAlphaCutoff;     // source alpha below this → no glyph

  float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main(){
    // pixel → cell space
    vec2 px     = vUv * uResolution;
    vec2 cell   = floor(px / uCellPx);
    vec2 cellUV = fract(px / uCellPx);

    // sample the source at the cell center (RGBA!)
    vec2 sampleUV = (cell + 0.5) * uCellPx / uResolution;
    vec4 src      = texture2D(uInput, sampleUV);

    // if the source alpha is low, output fully transparent (skip glyph)
    // small feather to avoid popping
    float gate = smoothstep(uAlphaCutoff - 0.02, uAlphaCutoff + 0.02, src.a);
    if (gate <= 0.0001) {
      gl_FragColor = vec4(0.0);
      return;
    }

    // map brightness to glyph index (0=lightest → last=darkest)
    float Y   = luma(src.rgb);
    float idx = floor( (1.0 - Y) * (uCharCount - 1.0) + 0.5 );

    // atlas lookup
    float cols = uAtlasGrid.x;
    float rows = uAtlasGrid.y;
    float col  = mod(idx, cols);
    float row  = floor(idx / cols);
    vec2 atlasUV = (vec2(col, row) + cellUV) / vec2(cols, rows);

    // glyph mask (white ink on black atlas)
    float g = texture2D(uAtlas, atlasUV).r;

    vec3 ink = (uUseColor ? src.rgb : uTextColor);

    // background or no background?
    // If uDrawBackground=false, only draw ink and let fragment alpha expose page below.
    vec3 outRGB;
    float outA;

    if (uDrawBackground) {
      // classic "ink over bg" look (opaque)
      outRGB = mix(uBgColor, ink, g);
      outA   = 1.0;
    } else {
      // no background: only glyph ink contributes, modulated by source alpha gate
      outRGB = ink * g * gate;
      outA   = g * gate;
    }

    gl_FragColor = vec4(outRGB, outA);
  }
`;