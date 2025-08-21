import * as THREE from 'three';
import type { FrameSpec } from './sizing';
import type { Layer, BlendMode } from './types';
import { TorusSceneLayer } from './layers/TorusSceneLayer';
import { CubeSceneLayer } from './layers/CubeSceneLayer';
import { DragonSceneLayer } from './layers/DragonSceneLayer';
import { PublicVideoLayer } from './layers/PublicVideoLayer';
import { makeTibetanAsciiAtlas, showAtlasDebug, makeAsciiAtlas } from '@/lib/graphics/asciiAtlas';
import FULLSCREEN_VERT from './shaders/fullscreen.vert.glsl';
import COPY_FRAG from './shaders/copy.frag.glsl';
import BLEND_FRAG from './shaders/blend.frag.glsl';
import ECHO_DELAYED_FRAG from './shaders/echoDelayed.frag.glsl';
import ASCII_FINAL_FRAG from './shaders/finalAscii.frag.glsl';
import PASSTHROUGH_FINAL_FRAG from './shaders/finalPassthrough.frag.glsl';

//helper functions

function modeToInt(m: BlendMode): number {
  switch (m) { case 'add': return 1; case 'multiply': return 2; case 'screen': return 3; default: return 0; }
}

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

class CompositeHistory {
  private buf: { rt: THREE.WebGLRenderTarget; t: number }[] = [];
  private capacity = 0;
  private next = 0;
  private acc = 0;

  // knobs
  private scale = 0.5; 
  private captureFPS = 60; 
  private maxDelaySec: number;

  private copyMat = new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: /* glsl */`
      varying vec2 vUv; uniform sampler2D uTex;
      void main(){ gl_FragColor = texture2D(uTex, vUv); }
    `,
    uniforms: { uTex: { value: null } },
    depthTest: false, depthWrite: false, transparent: false, toneMapped: false
  });
  private copyQuad = new FullscreenQuad(this.copyMat);

  constructor(maxDelaySec = 3.0, opts?: { scale?: number; captureFPS?: number }) {
    this.maxDelaySec = Math.max(0.5, maxDelaySec);
    if (opts?.scale !== undefined)      this.scale      = THREE.MathUtils.clamp(opts.scale, 0.25, 1.0);
    if (opts?.captureFPS !== undefined) this.captureFPS = Math.max(8, Math.min(60, Math.round(opts.captureFPS)));
  }

  resize(spec: FrameSpec, renderer: THREE.WebGLRenderer) {
    for (const f of this.buf) f.rt.dispose();
    this.buf.length = 0;
    this.capacity = Math.ceil(this.maxDelaySec * this.captureFPS) + 4;
    this.next = 0;
    this.acc = 0;

    const w = Math.max(1, Math.round(spec.pxW * this.scale));
    const h = Math.max(1, Math.round(spec.pxH * this.scale));
    const opts: THREE.RenderTargetOptions = { depthBuffer: false, stencilBuffer: false, generateMipmaps: false };

    const pr = renderer.getPixelRatio();
    for (let i = 0; i < this.capacity; i++) {
      const rt = new THREE.WebGLRenderTarget(w, h, opts);
      renderer.setRenderTarget(rt);
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, w / pr, h / pr);
      renderer.clear(true, true, true);
      this.buf.push({ rt, t: -1e9 });
    }
  }

  capture(renderer: THREE.WebGLRenderer, compositeTex: THREE.Texture, nowSec: number, dtSec: number) {
    this.acc += dtSec;
    const interval = 1 / this.captureFPS;
    while (this.acc >= interval) {
      this.acc -= interval;
      (this.copyMat.uniforms.uTex.value as any) = compositeTex;
      this.copyQuad.setMaterial(this.copyMat);
      const slot = this.buf[this.next];
      this.copyQuad.render(renderer, slot.rt);
      slot.t = nowSec;
      this.next = (this.next + 1) % this.capacity;
    }
  }

  sample(nowSec: number, delaySec: number): { A: THREE.Texture; B: THREE.Texture; t: number } {
    const target = nowSec - delaySec;

    let A = -1, B = -1, At = -1e9, Bt = 1e9;
    for (let i = 0; i < this.capacity; i++) {
      const ti = this.buf[i].t;
      if (ti <= target && ti > At) { At = ti; A = i; }
      if (ti >= target && ti < Bt) { Bt = ti; B = i; }
    }

    if (A === -1 && B === -1) {
      const tex = this.buf[0].rt.texture;
      return { A: tex, B: tex, t: 0.0 };
    }
    if (A === -1) {
      const tex = this.buf[B].rt.texture;
      return { A: tex, B: tex, t: 0.0 };
    }
    if (B === -1) {
      const tex = this.buf[A].rt.texture;
      return { A: tex, B: tex, t: 0.0 };
    }

    const Atex = this.buf[A].rt.texture;
    const Btex = this.buf[B].rt.texture;
    const denom = Math.max(1e-6, (Bt - At));
    const t = THREE.MathUtils.clamp((target - At) / denom, 0, 1);
    return { A: Atex, B: Btex, t };
  }

  dispose(){ for (const f of this.buf) f.rt.dispose(); this.buf.length = 0; }
}

class FullCompositeEchoPass {
  private mat: THREE.ShaderMaterial;
  private quad: FullscreenQuad;
  private outRT!: THREE.WebGLRenderTarget;

  constructor() {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: ECHO_DELAYED_FRAG,
      uniforms: {
        uNow: { value: null },

        u3A: { value: null }, u3B: { value: null }, u3t: { value: 0.0 }, u3w: { value: 0.9 }, u3s: { value: 1.02 },
        u2A: { value: null }, u2B: { value: null }, u2t: { value: 0.0 }, u2w: { value: 0.7 }, u2s: { value: 1.04 },
        u1A: { value: null }, u1B: { value: null }, u1t: { value: 0.0 }, u1w: { value: 0.5 }, u1s: { value: 1.06 },

        uUseLumaAlpha: { value: true },
        uForceOpaque:  { value: false },

        uCenter: { value: new THREE.Vector2(0.5, 0.5) }, // scale pivot
      },
      transparent: false, depthTest: false, depthWrite: false, toneMapped: false
    });
    this.quad = new FullscreenQuad(this.mat);
  }

  resize(spec: FrameSpec, renderer: THREE.WebGLRenderer) {
    this.outRT?.dispose();
    const opts: THREE.RenderTargetOptions = { depthBuffer: false, stencilBuffer: false, generateMipmaps: false };
    this.outRT = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, opts);

    const pr = renderer.getPixelRatio();
    renderer.setScissorTest(false);
    renderer.setRenderTarget(this.outRT);
    renderer.setViewport(0, 0, this.outRT.width / pr, this.outRT.height / pr);
    renderer.clear(true, true, true);
  }

  setWeights(w3: number, w2: number, w1: number){
    (this.mat.uniforms.u3w.value as number) = w3;
    (this.mat.uniforms.u2w.value as number) = w2;
    (this.mat.uniforms.u1w.value as number) = w1;
  }

  setScaleWeights(s3: number, s2: number, s1: number){
    (this.mat.uniforms.u3s.value as number) = Math.max(0.01, s3);
    (this.mat.uniforms.u2s.value as number) = Math.max(0.01, s2);
    (this.mat.uniforms.u1s.value as number) = Math.max(0.01, s1);
  }

  setScaleCenter(x: number, y: number){
    (this.mat.uniforms.uCenter.value as THREE.Vector2).set(x, y);
  }

  setUseLumaAlpha(on: boolean){ (this.mat.uniforms.uUseLumaAlpha.value as boolean) = on; }
  setForceOpaque(on: boolean){ (this.mat.uniforms.uForceOpaque.value as boolean) = on; }

  process(
    renderer: THREE.WebGLRenderer,
    nowTex: THREE.Texture,
    s3: { A: THREE.Texture; B: THREE.Texture; t: number },
    s2: { A: THREE.Texture; B: THREE.Texture; t: number },
    s1: { A: THREE.Texture; B: THREE.Texture; t: number },
  ): THREE.Texture {
    this.mat.uniforms.uNow.value = nowTex;

    this.mat.uniforms.u3A.value = s3.A; this.mat.uniforms.u3B.value = s3.B; (this.mat.uniforms.u3t.value as number) = s3.t;
    this.mat.uniforms.u2A.value = s2.A; this.mat.uniforms.u2B.value = s2.B; (this.mat.uniforms.u2t.value as number) = s2.t;
    this.mat.uniforms.u1A.value = s1.A; this.mat.uniforms.u1B.value = s1.B; (this.mat.uniforms.u1t.value as number) = s1.t;

    this.quad.setMaterial(this.mat);
    this.quad.render(renderer, this.outRT);
    return this.outRT.texture;
  }

  dispose(){ this.outRT?.dispose(); }
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
  setEchoScaleWeights(s3: number, s2: number, s1: number): void;
  setEchoParams(p: Partial<{
    w3: number; w2: number; w1: number;
  
    useLumaAlpha: boolean;
    forceOpaque: boolean;
  
    captureFPS: number; 
    scale: number; 
    maxDelaySec: number;}>): void;
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
  flag.setWhiteKey({ low: 0.98, high: 0.99 });

  const backgroundFlag = new PublicVideoLayer('background-flag', renderer, '/backgroundflags.mp4');
  backgroundFlag.zIndex = 1;
  backgroundFlag.opacity = 1.0;
  backgroundFlag.blendMode = 'normal'; 
  backgroundFlag.setWhiteKey({ low: 0.98, high: 0.99 });

  const particles = new PublicVideoLayer('particles', renderer, '/particles.mp4');
  particles.zIndex = 1;
  particles.opacity = 1;
  particles.blendMode = 'normal';

  const dragon = new DragonSceneLayer('dragon-layer', renderer, '/dragon.glb');
  dragon.zIndex = 2;
  dragon.opacity = 1.0;
  dragon.blendMode = 'normal';

  dragon.setParticleParamsExternal({
    ratePerBone: 2,
    speedForMaxRate: 30,
    inheritFactor: 1,
    jitter: 0.9,
    drag: 1,
    gravity: [1, 0, 0],
    sizeMin: 0.005, sizeMax: 0.03,
    lifeMin: 3, lifeMax: 5,
    opacity: 0.05,
    minRateBaseline: 0 
  });
  
  layers.push(dragon,flag,backgroundFlag);

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

  const history  = new CompositeHistory(1, { scale: 0.5, captureFPS: 60 });
  const echoPass = new FullCompositeEchoPass();
  echoPass.setWeights(0.1, 0.1, 0.6); 
  echoPass.setScaleWeights(1.06, 1.04, 1.02);
  echoPass.setUseLumaAlpha(false); 

  let lastDt = 1 / 60;
  let lastSpec: FrameSpec | null = null;

  let echoEnabled  = true;

  return {
    resize(spec) {
      lastSpec = spec;
      compositor.resize(spec);
      history.resize(spec, renderer);
      echoPass.resize(spec, renderer);
      for (const l of layers) { (l as any).rt ? l.resize(spec) : l.init(spec); }
      asciiPass.setResolution(spec.pxW, spec.pxH);
      plainPass.setResolution(spec.pxW, spec.pxH);
    },

    update(time, dt) {
      lastDt = dt; 
      for (const l of layers) l.update(time, dt);
      asciiPass.setTime(time);
      plainPass.setTime(time);
    },

    render(target) {
      const compositeTex = compositor.composite(layers);

      const nowSec = performance.now() * 0.001;
      history.capture(renderer, compositeTex, nowSec, lastDt);

      const postInput = echoEnabled
        ? (() => {
            const s3 = history.sample(nowSec, 0.3);
            const s2 = history.sample(nowSec, 0.2);
            const s1 = history.sample(nowSec, 0.1);
            return echoPass.process(renderer, compositeTex, s3, s2, s1);
          })()
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
      history.dispose();
    },

    // ascii
    setAsciiEnabled(on: boolean) { asciiEnabled = on; },
    toggleAscii() { asciiEnabled = !asciiEnabled; },
    isAsciiEnabled() { return asciiEnabled; },

    // echo
    setEchoEnabled(on: boolean) { echoEnabled = on; },
    toggleEcho() { echoEnabled = !echoEnabled; },
    isEchoEnabled() { return echoEnabled; },

    setEchoScaleWeights(s3, s2, s1) { echoPass.setScaleWeights(s3, s2, s1); },
    setEchoParams(p: Partial<{
      w3: number; w2: number; w1: number;
      useLumaAlpha: boolean; forceOpaque: boolean;
      captureFPS: number; scale: number; maxDelaySec: number;
    }>) {
      if (p.w3 !== undefined || p.w2 !== undefined || p.w1 !== undefined) {
        echoPass.setWeights(
          p.w3 ?? (echoPass as any).mat.uniforms.u3w.value,
          p.w2 ?? (echoPass as any).mat.uniforms.u2w.value,
          p.w1 ?? (echoPass as any).mat.uniforms.u1w.value,
        );
      }
      if (p.useLumaAlpha !== undefined) echoPass.setUseLumaAlpha(p.useLumaAlpha);
      if (p.forceOpaque  !== undefined) echoPass.setForceOpaque(p.forceOpaque);

      if (p.captureFPS !== undefined || p.scale !== undefined || p.maxDelaySec !== undefined) {
        const newHist = new CompositeHistory(p.maxDelaySec ?? 3.0, {
          scale: p.scale ?? 0.5,
          captureFPS: p.captureFPS ?? 24,
        });
        history.dispose();
        (history as any) = newHist; // rebind
        if (lastSpec) newHist.resize(lastSpec, renderer);
      }
    },
  };
}
