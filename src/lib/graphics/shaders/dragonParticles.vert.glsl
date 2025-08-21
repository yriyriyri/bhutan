attribute float aSize;
varying float vAlpha;
uniform float uOpacity;
uniform float uSizeScale; 

void main(){
  vAlpha = uOpacity;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mv.z, 0.0001);
  float sizePx = aSize * uSizeScale / dist;
  gl_PointSize = sizePx;
  gl_Position = projectionMatrix * mv;
}
