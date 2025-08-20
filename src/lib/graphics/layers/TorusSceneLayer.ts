import * as THREE from 'three';
import { BaseSceneLayer } from './BaseSceneLayer';

export class TorusSceneLayer extends BaseSceneLayer {
  protected build(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const geo = new THREE.TorusKnotGeometry(1, 0.35, 200, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0x66aaff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'torus';
    scene.add(mesh);

    // scene.add(new THREE.AxesHelper(0.5));

    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 4);
    scene.add(amb, dir);

    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
  }

  update(_time: number, dt: number) {
    const m = this.scene.getObjectByName('torus') as THREE.Mesh | null;
    if (m) { m.rotation.x += dt * 0.5; m.rotation.y += dt * 0.7; }
  }
}