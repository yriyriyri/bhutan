varying vec2 vUv;
uniform sampler2D uScene;
uniform vec2  uResolution; 
uniform float uExposure;
uniform float uContrast;
uniform float uOutlinePx;
uniform vec3  uOutlineColor;
uniform float uOutlineOpacity;

void main(){
  vec4 src = texture2D(uScene, vUv);

  vec3 rgb = src.rgb * uExposure;
  rgb = (rgb - 0.5) * uContrast + 0.5;
  rgb = clamp(rgb, 0.0, 1.0);

  float a = src.a;

  vec2 texel = 1.0 / uResolution;
  float r = max(uOutlinePx, 0.0);

  float d = 0.0;
  d = max(d, texture2D(uScene, vUv + vec2( r,  0.0) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2(-r,  0.0) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2( 0.0,  r ) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2( 0.0, -r ) * texel).a);
  float rd = r * 0.7071;
  d = max(d, texture2D(uScene, vUv + vec2( rd,  rd) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2(-rd,  rd) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2( rd, -rd) * texel).a);
  d = max(d, texture2D(uScene, vUv + vec2(-rd, -rd) * texel).a);

  float dilated = max(d, a);
  float outline = clamp(dilated - a, 0.0, 1.0);
  float oA = outline * uOutlineOpacity;

  if (oA > 0.001 && a < 0.001) {
    gl_FragColor = vec4(uOutlineColor, oA);
  } else {
    gl_FragColor = vec4(rgb, a);
  }
}
