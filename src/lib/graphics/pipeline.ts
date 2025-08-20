import * as THREE from 'three';
import type { FrameSpec } from './sizing';
import type { Layer, BlendMode } from './types';
import { TorusSceneLayer } from './layers/TorusSceneLayer';
import { CubeSceneLayer } from './layers/CubeSceneLayer';
import { PublicVideoLayer } from './layers/PublicVideoLayer';
import { ASCII_FINAL_FRAG } from './shaders/finalAscii';
import { PASSTHROUGH_FINAL_FRAG } from './shaders/finalPassthrough';
import { makeAsciiAtlas } from './asciiAtlas';

// full screen quad helper
class FullscreenQuad {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh;

  constructor(material: THREE.Material) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, material);
    this.scene.add(this.mesh);
  }
  setMaterial(m: THREE.Material) { this.mesh.material = m; }
  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    const pr = renderer.getPixelRatio();
    if (target) {
      renderer.setRenderTarget(target);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, target.width / pr, target.height / pr);
    } else {
      const css = new THREE.Vector2();
      renderer.getSize(css); // css pixels
      renderer.setRenderTarget(null);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, css.x, css.y);
    }
    renderer.clear(true, true, true);
    renderer.render(this.scene, this.camera);
  }
}

// passes  ;; copy, blend, final
class CopyPass {
  private material: THREE.ShaderMaterial;
  private quad: FullscreenQuad;
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COPY_FRAG,
      uniforms: { uTex: { value: null as THREE.Texture | null } },
      transparent: false, depthTest: false, depthWrite: false
    });
    this.quad = new FullscreenQuad(this.material);
  }
  setInput(tex: THREE.Texture) { this.material.uniforms.uTex.value = tex; }
  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget) {
    this.quad.render(renderer, target);
  }
}

class BlendPass {
  private material: THREE.ShaderMaterial;
  private quad: FullscreenQuad;
  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLEND_FRAG,
      uniforms: {
        uBase: { value: null as THREE.Texture | null },
        uTop: { value: null as THREE.Texture | null },
        uOpacity: { value: 1.0 },
        uMode: { value: 0 },
      },
      transparent: false, depthTest: false, depthWrite: false
    });
    this.quad = new FullscreenQuad(this.material);
  }
  setInputs(base: THREE.Texture, top: THREE.Texture, opacity: number, mode: BlendMode) {
    this.material.uniforms.uBase.value = base;
    this.material.uniforms.uTop.value = top;
    this.material.uniforms.uOpacity.value = opacity;
    this.material.uniforms.uMode.value = modeToInt(mode);
  }
  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget) {
    this.quad.render(renderer, target);
  }
}

class FinalPass {
  private material: THREE.ShaderMaterial;
  private quad: FullscreenQuad;
  constructor(userFragmentShader: string) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: userFragmentShader,
      uniforms: {
        uInput: { value: null as THREE.Texture | null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
      },
      transparent: false, depthTest: false, depthWrite: false
    });
    this.quad = new FullscreenQuad(this.material);
  }
  get uniforms() { return this.material.uniforms as Record<string, any>; }

  setInput(tex: THREE.Texture) { this.material.uniforms.uInput.value = tex; }
  setResolution(w: number, h: number) { this.material.uniforms.uResolution.value.set(w, h); }
  setTime(t: number) { this.material.uniforms.uTime.value = t; }
  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    this.quad.render(renderer, target);
  }
}

function modeToInt(m: BlendMode): number {
  switch (m) { case 'add': return 1; case 'multiply': return 2; case 'screen': return 3; default: return 0; }
}

// pingpong + blend compositor 
class Compositor {
  private copy = new CopyPass();
  private blend = new BlendPass();
  private accumA!: THREE.WebGLRenderTarget;
  private accumB!: THREE.WebGLRenderTarget;
  private read!: THREE.WebGLRenderTarget;
  private write!: THREE.WebGLRenderTarget;

  constructor(private renderer: THREE.WebGLRenderer) {}

  resize(spec: FrameSpec) {
    this.accumA?.dispose(); 
    this.accumB?.dispose();

    const rtParams: THREE.RenderTargetOptions = {
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false
    };

    this.accumA = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, rtParams);
    this.accumB = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, rtParams);
  }

  private clearRT(rt: THREE.WebGLRenderTarget) {
    // setviewport expects css pixels, rt sizes device pixels  -  divide by PR
    const pr = this.renderer.getPixelRatio();
    this.renderer.setRenderTarget(rt);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, rt.width / pr, rt.height / pr);
    this.renderer.clear(true, true, true);
  }

  composite(layers: Layer[]): THREE.Texture {
    const visible = layers
      .filter(l => l.visible)
      .sort((a, b) => a.zIndex - b.zIndex);

    // reset pingpong heads
    this.read  = this.accumA;
    this.write = this.accumB;

    this.clearRT(this.accumA);
    this.clearRT(this.accumB);
    if (visible.length === 0) return this.accumA.texture;
    const firstRT = visible[0].render();
    this.copy.setInput(firstRT.texture);
    this.copy.render(this.renderer, this.read);

    // blend loop
    for (let i = 1; i < visible.length; i++) {
      const layer = visible[i];
      const topRT = layer.render();
      this.blend.setInputs(this.read.texture, topRT.texture, layer.opacity, layer.blendMode);
      this.blend.render(this.renderer, this.write);
      const tmp = this.read; this.read = this.write; this.write = tmp;
    }

    return this.read.texture;
  }
}

export interface Pipeline {
  resize(spec: FrameSpec): void;
  update(time: number, dt: number): void;
  render(target: THREE.WebGLRenderTarget | null): void;
  dispose(): void;

  setAsciiEnabled(on: boolean): void;
  toggleAscii(): void;
  isAsciiEnabled(): boolean;
}

export function createPipeline(renderer: THREE.WebGLRenderer): Pipeline {
  const compositor = new Compositor(renderer);
  const layers: Layer[] = [];

  const torus = new TorusSceneLayer('torus-layer', renderer); torus.zIndex = 0; torus.opacity = 1.0;
  const cube  = new CubeSceneLayer('cube-layer', renderer);   cube.zIndex  = 1; cube.opacity  = 0.95;

  const flag = new PublicVideoLayer('flag', renderer, '/test_1.mp4');
  flag.zIndex = 4;
  flag.opacity = 1;
  flag.blendMode = 'normal';
  
  // const backgroundFlag = new PublicVideoLayer('background-flag', renderer, '/backgroundflags.mp4');
  // backgroundFlag.zIndex = 3;
  // backgroundFlag.opacity = 1.0;
  // backgroundFlag.blendMode = 'normal'; 
  // backgroundFlag.setWhiteKey({ low: 0.98, high: 0.99 });
  
  layers.push(flag, );

  const asciiPass = new FinalPass(ASCII_FINAL_FRAG);
  const plainPass = new FinalPass(PASSTHROUGH_FINAL_FRAG);
  let asciiEnabled = true; 

  const chars = " .'`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const atlas = makeAsciiAtlas(chars, 48, "700 40px 'Courier New', monospace");
  
  asciiPass.uniforms.uAtlas = { value: atlas.texture };
  asciiPass.uniforms.uAtlasGrid = { value: new THREE.Vector2(atlas.cols, atlas.rows) };
  asciiPass.uniforms.uCharCount = { value: atlas.count };
  asciiPass.uniforms.uCellPx = { value: new THREE.Vector2(10.0, 18.0) }; 
  asciiPass.uniforms.uDrawBackground = { value: true };        // ← no background fill
  asciiPass.uniforms.uAlphaCutoff = { value: 0.03 }; 
  
  asciiPass.uniforms.uUseColor = { value: true };
  asciiPass.uniforms.uTextColor = { value: new THREE.Color(0x000000) };
  asciiPass.uniforms.uBgColor = { value: new THREE.Color(0xffffff) };

  return {
    resize(spec) {
      compositor.resize(spec);
      for (const l of layers) { (l as any).rt ? l.resize(spec) : l.init(spec); }
      asciiPass.setResolution(spec.pxW, spec.pxH);
      plainPass.setResolution(spec.pxW, spec.pxH);
    },
    update(time, dt) {
      for (const l of layers) l.update(time, dt);
      asciiPass.setTime(time);
      plainPass.setTime(time);
    },
    render(target) {
      const compositeTex = compositor.composite(layers);
      if (asciiEnabled) {
        asciiPass.setInput(compositeTex);
        asciiPass.render(renderer, target);
      } else {
        plainPass.setInput(compositeTex);
        plainPass.render(renderer, target);
      }
    },
    dispose() {
      for (const l of layers) l.dispose();
    },
    setAsciiEnabled(on: boolean) { asciiEnabled = on; },
    toggleAscii() { asciiEnabled = !asciiEnabled; },
    isAsciiEnabled() { return asciiEnabled; },
  };
}

const FULLSCREEN_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const COPY_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uTex;
  void main() { gl_FragColor = texture2D(uTex, vUv); }
`;

const BLEND_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uBase;
  uniform sampler2D uTop;
  uniform float uOpacity;
  uniform int uMode; // 0=normal  1=add  2=multiply  3=screen

  vec3 blendAdd(vec3 b, vec3 t){ return b + t; }
  vec3 blendMultiply(vec3 b, vec3 t){ return b * t; }
  vec3 blendScreen(vec3 b, vec3 t){ return 1.0 - (1.0 - b) * (1.0 - t); }

  void main() {
    vec4 base = texture2D(uBase, vUv);
    vec4 top  = texture2D(uTop,  vUv);

    vec3 blended;
    if (uMode == 1) blended = blendAdd(base.rgb, top.rgb);
    else if (uMode == 2) blended = blendMultiply(base.rgb, top.rgb);
    else if (uMode == 3) blended = blendScreen(base.rgb, top.rgb);
    else blended = top.rgb; // normal

    float a = clamp(top.a * uOpacity, 0.0, 1.0);
    vec3 rgb = mix(base.rgb, blended, a);
    float alpha = base.a + a * (1.0 - base.a);

    gl_FragColor = vec4(rgb, alpha);
  }
`;