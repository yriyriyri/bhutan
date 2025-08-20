import * as THREE from 'three';
import { BaseVideoLayer } from './BaseVideoLayer';

//default public vid  for starting can add custom intercepts later

export class PublicVideoLayer extends BaseVideoLayer {
  constructor(id: string, renderer: THREE.WebGLRenderer, path: string) {
    super(id, renderer, path);
  }
}