#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;

uniform sampler2D uInput;   
uniform vec2  uResolution;
uniform float uTime;

uniform sampler2D uAtlas;
uniform vec2  uAtlasGrid; 
uniform float uCharCount;
uniform vec2  uCellPx;

uniform bool  uUseColor;
uniform vec3  uTextColor;

uniform bool  uDrawBackground;
uniform vec3  uBgColor;

uniform float uAlphaCutoff;

float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main(){
  vec2 px     = vUv * uResolution;
  vec2 cell   = floor(px / uCellPx);
  vec2 cellUV = fract(px / uCellPx);

  vec2 sampleUV = (cell + 0.5) * uCellPx / uResolution;
  vec4 src      = texture2D(uInput, sampleUV);

  float gate = smoothstep(uAlphaCutoff - 0.02, uAlphaCutoff + 0.02, src.a);
  if (gate <= 0.0001) {
    gl_FragColor = vec4(0.0);
    return;
  }

  float Y   = luma(src.rgb);
  float idx = floor( (1.0 - Y) * (uCharCount - 1.0) + 0.5 );

  float cols = uAtlasGrid.x;
  float rows = uAtlasGrid.y;
  float col  = mod(idx, cols);
  float row  = floor(idx / cols);
  vec2 atlasUV = (vec2(col, row) + cellUV) / vec2(cols, rows);

  float g = texture2D(uAtlas, atlasUV).r;

  vec3 ink = (uUseColor ? src.rgb : uTextColor);

  vec3 outRGB;
  float outA;

  if (uDrawBackground) {
    outRGB = mix(uBgColor, ink, g);
    outA   = 1.0;
  } else {
    outRGB = ink * g * gate;
    outA   = g * gate;
  }

  gl_FragColor = vec4(outRGB, outA);
}
