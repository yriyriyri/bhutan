// src/lib/graphics/layers/BottomAnchoredPublicVideoLayer.ts
import * as THREE from 'three';
import type { FrameSpec } from '../sizing';
import type { Layer } from '../types';
import type { BlendMode } from '../types';
import FULLSCREEN_VERT from '../shaders/fullscreen.vert.glsl';
import FIT_WIDTH_BOTTOM_FRAG from '../shaders/fitWidthBottom.frag.glsl';

export class BottomAnchoredPublicVideoLayer implements Layer {
  id: string;
  visible = true;
  zIndex = 0;
  opacity = 1.0;
  blendMode: BlendMode = 'normal';

  private renderer: THREE.WebGLRenderer;
  private rt!: THREE.WebGLRenderTarget;

  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private video!: HTMLVideoElement;
  private videoTex!: THREE.VideoTexture;
  private contentAspect = 16 / 9; 

  private uOutResolution = new THREE.Vector2(1, 1);

  constructor(id: string, renderer: THREE.WebGLRenderer, videoUrl: string, fallbackAspect = 16 / 9) {
    this.id = id;
    this.renderer = renderer;
    this.contentAspect = fallbackAspect;
    this.makeVideoElement(videoUrl);
    this.makeQuad();
  }

  private makeVideoElement(url: string) {
    const v = document.createElement('video');
    v.src = url;
    v.crossOrigin = 'anonymous';
    v.loop = true;
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';

    v.addEventListener('loadedmetadata', () => {
      const vw = v.videoWidth || 0;
      const vh = v.videoHeight || 0;
      if (vw > 0 && vh > 0) {
        this.contentAspect = vw / Math.max(1, vh);
        (this.quad.material.uniforms.uContentAspect.value as number) = this.contentAspect;
      }
    });

    v.addEventListener('canplay', () => { v.play().catch(() => {}); });
    v.addEventListener('error', (e) => console.warn(`[${this.id}] video error`, e));

    this.video = v;

    const tex = new THREE.VideoTexture(v);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBAFormat;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = false;

    tex.flipY = false;

    this.videoTex = tex;
  }

  private makeQuad() {
    const mat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: FIT_WIDTH_BOTTOM_FRAG,
      uniforms: {
        uVideo: { value: this.videoTex },
        uOutResolution: { value: this.uOutResolution },
        uContentAspect: { value: this.contentAspect },
        uOpacity: { value: this.opacity },

        uKeyMode: { value: 0 }, 
        uKeyLow: { value: 0.02 },
        uKeyHigh: { value: 0.10 },
        uPremultiply: { value: false },
        uFlipY: { value: true },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.scene.add(this.quad);
  }

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
    this.uOutResolution.set(spec.pxW, spec.pxH);
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
      this.video.load?.();
    }
  }

  public setWhiteKey(opts: { low?: number; high?: number; premultiply?: boolean } = {}) {
    const u = (this.quad.material as THREE.ShaderMaterial).uniforms;
    u.uKeyMode.value = 2;
    if (opts.low  !== undefined) u.uKeyLow.value  = opts.low;
    if (opts.high !== undefined) u.uKeyHigh.value = opts.high;
    if (opts.premultiply !== undefined) u.uPremultiply.value = opts.premultiply;
  }

  public setBlackKey(opts: { low?: number; high?: number; premultiply?: boolean } = {}) {
    const u = (this.quad.material as THREE.ShaderMaterial).uniforms;
    u.uKeyMode.value = 1;
    if (opts.low  !== undefined) u.uKeyLow.value  = opts.low;
    if (opts.high !== undefined) u.uKeyHigh.value = opts.high;
    if (opts.premultiply !== undefined) u.uPremultiply.value = opts.premultiply;
  }

  public clearKey() {
    (this.quad.material as THREE.ShaderMaterial).uniforms.uKeyMode.value = 0;
  }
}