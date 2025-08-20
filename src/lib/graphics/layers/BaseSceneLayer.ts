import * as THREE from 'three';
import type { FrameSpec } from '../sizing';
import type { Layer } from '../types';
import type { BlendMode } from '../types';

import { frameScenePerspective, logOriginNDC } from '../cameraUtils';

export abstract class BaseSceneLayer implements Layer {
  id: string;
  visible = true;
  zIndex = 0;
  opacity = 1;
  blendMode: BlendMode = 'normal';

  protected renderer: THREE.WebGLRenderer;
  protected rt!: THREE.WebGLRenderTarget;
  protected scene = new THREE.Scene();
  protected camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);

  constructor(id: string, renderer: THREE.WebGLRenderer) {
    this.id = id;
    this.renderer = renderer;
    this.build(this.scene, this.camera);
  }

  //subclasses fill the scene / camera
  protected abstract build(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void;

  //per frame anim  
  update(_time: number, _dt: number) {}

  init(spec: FrameSpec) {
    console.log(`[${this.id}] init`, spec.pxW, spec.pxH);
    this.rt = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, {
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
      type: THREE.UnsignedByteType,
    });
    this.resize(spec);
  }

  resize(spec: FrameSpec) {
    this.camera.aspect = spec.pxW / spec.pxH;
    this.camera.updateProjectionMatrix();

    // frame and center scene  (immune to aspect changes  such as from mobile etc)
    frameScenePerspective(this.camera, this.scene, this.camera.aspect, 1.25);

    this.rt.setSize(spec.pxW, spec.pxH);
    console.log(`[${this.id}] aspect=${(spec.pxW/spec.pxH).toFixed(3)} rt=${this.rt.width}x${this.rt.height}`);
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

  dispose() { this.rt?.dispose(); }
}