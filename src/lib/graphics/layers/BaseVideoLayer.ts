import * as THREE from 'three';
import type { FrameSpec } from '../sizing';
import type { Layer } from '../types';
import type { BlendMode } from '../types';
import FULLSCREEN_VERT from '../shaders/fullscreen.vert.glsl';
import VIDEO_FRAG from '../shaders/video.frag.glsl'

//full screen vid  to render target layer for pipeline
export class BaseVideoLayer implements Layer {
  id: string;
  visible = true;
  zIndex = 0;
  opacity = 1;
  blendMode: BlendMode = 'normal';

  protected renderer: THREE.WebGLRenderer;

  protected rt!: THREE.WebGLRenderTarget;

  protected scene = new THREE.Scene();
  protected camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  protected quad!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  protected video!: HTMLVideoElement;
  protected videoTex!: THREE.VideoTexture;
  protected videoW = 0;
  protected videoH = 0;

  protected uUVScale = new THREE.Vector2(1, 1);
  protected uUVOffset = new THREE.Vector2(0, 0);

  constructor(id: string, renderer: THREE.WebGLRenderer, videoUrl: string) {
    this.id = id;
    this.renderer = renderer;
    this.makeVideoElement(videoUrl);
    this.makeQuad();
  }

  //setup
  protected makeVideoElement(url: string) {
    const v = document.createElement('video');
    v.src = url;
    v.crossOrigin = 'anonymous';
    v.loop = true;
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', ''); // ios specific
    v.preload = 'auto';

    v.addEventListener('loadedmetadata', () => {
      this.videoW = v.videoWidth || 0;
      this.videoH = v.videoHeight || 0;
      this.updateCoverUV(); // compute initial cover transform
    });

    v.addEventListener('canplay', () => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {/* user gesture mayb required on some browsers */});
    });

    v.addEventListener('error', (e) => {
      console.warn(`[${this.id}] video error`, e);
    });

    this.video = v;

    const tex = new THREE.VideoTexture(v);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBAFormat;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;

    this.videoTex = tex;
  }

  protected makeQuad() {
  
    const mat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: VIDEO_FRAG,
      uniforms: {
        uVideo: { value: this.videoTex },
        uUVScale: { value: this.uUVScale },
        uUVOffset: { value: this.uUVOffset },
        uOpacity: { value: this.opacity },
        uKeyMode: { value: 0 }, // off by default
        uKeyLow: { value: 0.02 }, // soft threshold start
        uKeyHigh: { value: 0.10 },  // soft threshold end
        uPremultiply: { value: false },  // compositor uses straight alpha
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
  
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.scene.add(this.quad);
  }

  //lifecycle
  init(spec: FrameSpec) {
    this.rt = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, {
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    });
    this.resize(spec);
  }

  resize(spec: FrameSpec) {
    this.rt.setSize(spec.pxW, spec.pxH);
    this.updateCoverUV(spec.pxW, spec.pxH);
  }

  update(_time: number, _dt: number) {
    if (this.video && this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
      this.videoTex.needsUpdate = true;
    }
    (this.quad.material.uniforms.uOpacity.value as number) = this.opacity;
  }

  render(): THREE.WebGLRenderTarget {
    this.renderer.setRenderTarget(this.rt);
    const pr = this.renderer.getPixelRatio();
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.rt.width / pr, this.rt.height / pr);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    return this.rt;
  }

  dispose() {
    this.rt?.dispose();
    this.videoTex?.dispose();
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      // @ts-ignore
      this.video.load?.();
    }
  }

  //fit math
  protected updateCoverUV(targetPxW?: number, targetPxH?: number) {
    if (!this.videoW || !this.videoH) return;

    let W = targetPxW, H = targetPxH;
    if (!W || !H) {
      const css = new THREE.Vector2();
      this.renderer.getSize(css);
      const pr = this.renderer.getPixelRatio();
      W = Math.max(1, Math.round(css.x * pr));
      H = Math.max(1, Math.round(css.y * pr));
    }

    const vw = this.videoW;
    const vh = this.videoH;

    const scale = Math.max(W! / vw, H! / vh);
    const dispW = vw * scale;
    const dispH = vh * scale;

    const uvScaleX = W! / dispW;
    const uvScaleY = H! / dispH;

    this.uUVScale.set(uvScaleX, uvScaleY);
    this.uUVOffset.set((1.0 - uvScaleX) * 0.5, (1.0 - uvScaleY) * 0.5);
  }

  public setWhiteKey(opts: { low?: number; high?: number; premultiply?: boolean } = {}) {
    const u = (this.quad.material as THREE.ShaderMaterial).uniforms;
    u.uKeyMode.value = 2; // white key
    if (opts.low  !== undefined) u.uKeyLow.value  = opts.low;
    if (opts.high !== undefined) u.uKeyHigh.value = opts.high;
    if (opts.premultiply !== undefined) u.uPremultiply.value = opts.premultiply;
  }
  
  public setBlackKey(opts: { low?: number; high?: number; premultiply?: boolean } = {}) {
    const u = (this.quad.material as THREE.ShaderMaterial).uniforms;
    u.uKeyMode.value = 1; // black key
    if (opts.low  !== undefined) u.uKeyLow.value  = opts.low;
    if (opts.high !== undefined) u.uKeyHigh.value = opts.high;
    if (opts.premultiply !== undefined) u.uPremultiply.value = opts.premultiply;
  }
  
  public clearKey() {
    (this.quad.material as THREE.ShaderMaterial).uniforms.uKeyMode.value = 0;
  }
}