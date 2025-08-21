export const COPY_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uTex;
  void main() { gl_FragColor = texture2D(uTex, vUv); }
`;