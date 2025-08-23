precision highp float;

varying vec2 vUv;
uniform sampler2D uInput;

void main() {
  vec4 c = texture2D(uInput, vUv);
  c.rgb = 1.0 - c.rgb;
  gl_FragColor = c;
}