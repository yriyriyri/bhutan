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

  protected lastSpec: FrameSpec | null = null;
  private _hasFramedOnce = false;

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
    this._hasFramedOnce = false;
    this.lastSpec = spec;
    this.resize(spec);
  }

  protected refit(fitScale = 1.25) {
    this.scene.scale.set(1, 1, 1);
    this.scene.updateMatrixWorld(true);
    frameScenePerspective(this.camera, this.scene, this.camera.aspect, fitScale);
    this._hasFramedOnce = true;
  }

  resize(spec: FrameSpec) {
    this.lastSpec = spec;

    this.camera.aspect = spec.pxW / spec.pxH;
    this.camera.updateProjectionMatrix();

    // frame and center scene  (immune to aspect changes  such as from mobile etc)
    if (!this._hasFramedOnce) {
      this.refit(1.25);
    }

    this.rt.setSize(spec.pxW, spec.pxH);
    console.log(`[${this.id}] aspect=${(spec.pxW/spec.pxH).toFixed(3)} rt=${this.rt.width}x${this.rt.height}`);
  }

  render(): THREE.WebGLRenderTarget {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.rt.width, this.rt.height);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    return this.rt;
  }

  dispose() { this.rt?.dispose(); }
}