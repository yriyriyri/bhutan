precision mediump float;
varying float vAlpha;
uniform vec3 uColor;

void main(){
  // circular mask
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  if (dot(uv, uv) > 1.0) discard;
  gl_FragColor = vec4(uColor, vAlpha);
}
