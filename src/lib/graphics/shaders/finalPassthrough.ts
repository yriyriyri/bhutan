export const PASSTHROUGH_FINAL_FRAG = /* glsl */`
  #ifdef GL_ES
  precision mediump float;
  #endif
  varying vec2 vUv;
  uniform sampler2D uInput;
  uniform vec2  uResolution;
  uniform float uTime;
  void main(){
    gl_FragColor = texture2D(uInput, vUv);
  }
`;