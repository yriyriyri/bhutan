import * as THREE from 'three';
import type { FrameSpec } from './sizing';

export type BlendMode = 'normal' | 'add' | 'multiply' | 'screen';

export interface Layer {
  id: string;
  visible: boolean;
  zIndex: number;
  opacity: number;
  blendMode: BlendMode;
  init(spec: FrameSpec): void;
  resize(spec: FrameSpec): void;
  update(time: number, dt: number): void;
  render(): THREE.WebGLRenderTarget;
  dispose(): void;
  unlockMedia?(): void;
}