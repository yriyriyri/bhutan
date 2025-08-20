import * as THREE from 'three';
import type { FrameSpec } from './sizing';
import type { Layer, BlendMode } from './types';
import { TorusSceneLayer } from './layers/TorusSceneLayer';
import { CubeSceneLayer } from './layers/CubeSceneLayer';
import { DragonSceneLayer } from './layers/DragonSceneLayer';
import { PublicVideoLayer } from './layers/PublicVideoLayer';
import { ASCII_FINAL_FRAG } from './shaders/finalAscii';
import { PASSTHROUGH_FINAL_FRAG } from './shaders/finalPassthrough';
import { makeTibetanAsciiAtlas, showAtlasDebug, makeAsciiAtlas } from '@/lib/graphics/asciiAtlas';

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

const TRAIL_UPDATE_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uPrevTrail;
  uniform sampler2D uCurr;
  uniform float uDecay;
  uniform float uInject;
  uniform vec3  uTint;
  uniform float uTintStrength;

  float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec4 prev = texture2D(uPrevTrail, vUv);

    vec3 prevRGB = mix(prev.rgb, prev.rgb * uTint, clamp(uTintStrength, 0.0, 1.0));
    vec4 faded   = vec4(prevRGB, prev.a) * clamp(uDecay, 0.0, 0.9999);

    vec4 curr = texture2D(uCurr, vUv);

    float currA = luma(curr.rgb);
    vec4 injected = vec4(curr.rgb, currA) * clamp(uInject, 0.0, 1.0);

    gl_FragColor = faded + injected;
  }
`;

const ECHO_COMPOSE_FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uBase;
  uniform sampler2D uTrail;
  uniform int uMode; 
  uniform bool uForceOpaque; 

  float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  vec3 screen(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }

  void main() {
    vec4 base  = texture2D(uBase,  vUv);
    vec4 trail = texture2D(uTrail, vUv);

    float trailA = max(trail.a, luma(trail.rgb)); 

    vec3 rgb;
    if (uMode == 1) {
      rgb = screen(base.rgb, trail.rgb);
    } else if (uMode == 2) {
      rgb = mix(trail.rgb, base.rgb, clamp(base.a, 0.0, 1.0));
    } else {
      rgb = clamp(base.rgb + trail.rgb, 0.0, 1.0);
    }

    float a = uForceOpaque ? 1.0 : max(base.a, trailA);
    gl_FragColor = vec4(rgb, a);
  }
`;

class EchoPass {
  private updateMat: THREE.ShaderMaterial;
  private composeMat: THREE.ShaderMaterial;
  private quad: FullscreenQuad;

  private trailA!: THREE.WebGLRenderTarget;
  private trailB!: THREE.WebGLRenderTarget;
  private trailRead!: THREE.WebGLRenderTarget;
  private trailWrite!: THREE.WebGLRenderTarget;

  private outRT!: THREE.WebGLRenderTarget;

  private elapsedSinceInject = 0;

  private params = {
    cadenceSec: 1.0,
    targetAfter1Sec: 0.5, 
    tint: new THREE.Color(0xffffff),
    tintStrength: 0.0,
    composeMode: 2 as 0|1|2,
    forceOpaque: false, 
  };

  constructor() {
    this.updateMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: TRAIL_UPDATE_FRAG,
      uniforms: {
        uPrevTrail:    { value: null },
        uCurr:         { value: null },
        uDecay:        { value: 0.9 },
        uInject:       { value: 1.0 },
        uTint:         { value: this.params.tint.clone() },
        uTintStrength: { value: this.params.tintStrength },
      },
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false
    });

    this.composeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ECHO_COMPOSE_FRAG,
      uniforms: {
        uBase:        { value: null },
        uTrail:       { value: null },
        uMode:        { value: this.params.composeMode },
        uForceOpaque: { value: this.params.forceOpaque },
      },
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false
    });

    this.quad = new FullscreenQuad(this.updateMat);
  }

  resize(spec: FrameSpec, renderer: THREE.WebGLRenderer) {
    this.trailA?.dispose(); this.trailB?.dispose();
    this.outRT?.dispose();

    const opts: THREE.RenderTargetOptions = { depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
    this.trailA = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, opts);
    this.trailB = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, opts);
    this.outRT  = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, opts);

    const pr = renderer.getPixelRatio();
    renderer.setScissorTest(false);

    renderer.setRenderTarget(this.trailA);
    renderer.setViewport(0, 0, this.trailA.width / pr, this.trailA.height / pr);
    renderer.clear(true, true, true);

    renderer.setRenderTarget(this.trailB);
    renderer.setViewport(0, 0, this.trailB.width / pr, this.trailB.height / pr);
    renderer.clear(true, true, true);

    renderer.setRenderTarget(this.outRT);
    renderer.setViewport(0, 0, this.outRT.width / pr, this.outRT.height / pr);
    renderer.clear(true, true, true);

    this.trailRead  = this.trailA;
    this.trailWrite = this.trailB;
    this.elapsedSinceInject = 0;
  }

  setParams(p: Partial<{
    cadenceSec: number;
    targetAfter1Sec: number;
    tint: THREE.Color | number | string;
    tintStrength: number;      // 0..1
    composeMode: 0|1|2;        // 0=add, 1=screen, 2=baseOverTrail
    forceOpaque: boolean;
  }>) {
    if (p.cadenceSec !== undefined) this.params.cadenceSec = Math.max(0.016, p.cadenceSec);
    if (p.targetAfter1Sec !== undefined) this.params.targetAfter1Sec = THREE.MathUtils.clamp(p.targetAfter1Sec, 0.0, 1.0);
    if (p.tint !== undefined) {
      const c = p.tint instanceof THREE.Color ? p.tint : new THREE.Color(p.tint as any);
      this.params.tint.copy(c);
      (this.updateMat.uniforms.uTint.value as THREE.Color).copy(c);
    }
    if (p.tintStrength !== undefined) {
      this.params.tintStrength = THREE.MathUtils.clamp(p.tintStrength, 0, 1);
      this.updateMat.uniforms.uTintStrength.value = this.params.tintStrength;
    }
    if (p.composeMode !== undefined) {
      this.params.composeMode = p.composeMode;
      (this.composeMat.uniforms.uMode.value as number) = this.params.composeMode;
    }
    if (p.forceOpaque !== undefined) {
      this.params.forceOpaque = p.forceOpaque;
      (this.composeMat.uniforms.uForceOpaque.value as boolean) = this.params.forceOpaque;
    }
  }

  process(renderer: THREE.WebGLRenderer, baseTex: THREE.Texture, dtSec: number): THREE.Texture {
    const decay = Math.pow(this.params.targetAfter1Sec, dtSec / 1.0);
    (this.updateMat.uniforms.uDecay.value as number) = decay;

    this.composeMat.uniforms.uBase.value  = baseTex;
    this.composeMat.uniforms.uTrail.value = this.trailRead.texture;
    this.quad.setMaterial(this.composeMat);
    this.quad.render(renderer, this.outRT);

    this.elapsedSinceInject += dtSec;
    const inject = (this.elapsedSinceInject >= this.params.cadenceSec) ? 1.0 : 0.0;
    if (inject > 0.5) this.elapsedSinceInject = 0.0;
    (this.updateMat.uniforms.uInject.value as number) = inject;

    this.updateMat.uniforms.uPrevTrail.value = this.trailRead.texture;
    this.updateMat.uniforms.uCurr.value      = baseTex;
    this.quad.setMaterial(this.updateMat);
    this.quad.render(renderer, this.trailWrite);

    const tmp = this.trailRead; this.trailRead = this.trailWrite; this.trailWrite = tmp;

    return this.outRT.texture;
  }

  dispose() {
    this.trailA?.dispose();
    this.trailB?.dispose();
    this.outRT?.dispose();
  }
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

  setEchoEnabled(off: boolean): void;
  toggleEcho(): void;
  isEchoEnabled(): boolean;
  setEchoParams(p: Partial<{ persistence: number; holdFrames: number; tint: THREE.Color | number | string; tintStrength: number }>): void;
}

export function createPipeline(renderer: THREE.WebGLRenderer): Pipeline {
  const compositor = new Compositor(renderer);

  const layers: Layer[] = [];

  const torus = new TorusSceneLayer('torus-layer', renderer); torus.zIndex = 0; torus.opacity = 1.0;
  const cube  = new CubeSceneLayer('cube-layer', renderer);   cube.zIndex  = 1; cube.opacity  = 0.95;

  // const flag = new PublicVideoLayer('flag', renderer, '/test_1.mp4');
  // flag.zIndex = 4;
  // flag.opacity = 1;
  // flag.blendMode = 'normal';

  const particles = new PublicVideoLayer('particles', renderer, '/particles.mp4');
  particles.zIndex = 1;
  particles.opacity = 1;
  particles.blendMode = 'normal';

  const dragon = new DragonSceneLayer('dragon-layer', renderer, '/dragon.glb');
  dragon.zIndex = 2;
  dragon.opacity = 1.0;
  dragon.blendMode = 'normal';

  dragon.setParticleParamsExternal({
    ratePerBone: 3,
    speedForMaxRate: 30,
    inheritFactor: 1,
    jitter: 0.9,
    drag: 1,
    gravity: [1, 0, 0],
    sizeMin: 0.005, sizeMax: 0.05,
    lifeMin: 3, lifeMax: 5,
    opacity: 0.4,
    minRateBaseline: 0 
  });
  
  // const backgroundFlag = new PublicVideoLayer('background-flag', renderer, '/backgroundflags.mp4');
  // backgroundFlag.zIndex = 3;
  // backgroundFlag.opacity = 1.0;
  // backgroundFlag.blendMode = 'normal'; 
  // backgroundFlag.setWhiteKey({ low: 0.98, high: 0.99 });
  
  layers.push(dragon, particles);

  const asciiPass = new FinalPass(ASCII_FINAL_FRAG);
  const plainPass = new FinalPass(PASSTHROUGH_FINAL_FRAG);
  let asciiEnabled = true; 

  const chars = " .'`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  const atlas = makeAsciiAtlas(chars, 48, "700 40px 'Courier New', monospace");
  // const atlas = makeTibetanAsciiAtlas(48);
  // showAtlasDebug(atlas.canvas, atlas.cols, atlas.rows, atlas.cellPx);
  
  asciiPass.uniforms.uAtlas = { value: atlas.texture };
  asciiPass.uniforms.uAtlasGrid = { value: new THREE.Vector2(atlas.cols, atlas.rows) };
  asciiPass.uniforms.uCharCount = { value: atlas.count };
  asciiPass.uniforms.uCellPx = { value: new THREE.Vector2(10.0, 10.0) }; 
  asciiPass.uniforms.uDrawBackground = { value: true };
  asciiPass.uniforms.uAlphaCutoff = { value: 0.03 }; 
  
  asciiPass.uniforms.uUseColor = { value: true };
  asciiPass.uniforms.uTextColor = { value: new THREE.Color(0x000000) };
  asciiPass.uniforms.uBgColor = { value: new THREE.Color(0xffffff) };
  const echoPass = new EchoPass();
  let lastDt = 1/60;
  let echoEnabled = false;
  echoPass.setParams({
    cadenceSec: 1.0, 
    targetAfter1Sec: 0.5,
    composeMode: 2,
    tint: 0xffffff,
    tintStrength: 0.0,
  });


  return {
    resize(spec) {
      compositor.resize(spec);
      echoPass.resize(spec, renderer);
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

      const postInput = echoEnabled
        ? echoPass.process(renderer, compositeTex, lastDt)
        : compositeTex;

      if (asciiEnabled) {
        asciiPass.setInput(postInput);
        asciiPass.render(renderer, target);
      } else {
        plainPass.setInput(postInput);
        plainPass.render(renderer, target);
      }
    },
    dispose() {
      for (const l of layers) l.dispose();
      echoPass.dispose();
    },
    setAsciiEnabled(on: boolean) { asciiEnabled = on; },
    toggleAscii() { asciiEnabled = !asciiEnabled; },
    isAsciiEnabled() { return asciiEnabled; },

    setEchoEnabled(on: boolean) { echoEnabled = on; },
    toggleEcho() { echoEnabled = !echoEnabled; },
    isEchoEnabled() { return echoEnabled; },
    setEchoParams(p) { echoPass.setParams(p); },
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