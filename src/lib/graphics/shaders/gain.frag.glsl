varying vec2 vUv;
uniform sampler2D uInput;
uniform float uGain;
void main() {
  vec4 c = texture2D(uInput, vUv);
  gl_FragColor = vec4(c.rgb * uGain, c.a);
}