import * as THREE from 'three';
import { BaseSceneLayer } from './BaseSceneLayer';

export class CubeSceneLayer extends BaseSceneLayer {
  protected build(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff9966 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'cube';
    mesh.position.set(0.6, -0.4, 0);
    scene.add(mesh);

    // scene.add(new THREE.AxesHelper(0.5));

    const amb = new THREE.AmbientLight(0xffffff, 0.2);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(-2, 2, 3);
    scene.add(amb, dir);

    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
  }

  update(_time: number, dt: number) {
    const m = this.scene.getObjectByName('cube') as THREE.Mesh | null;
    if (m) { m.rotation.y += dt * 0.8; m.rotation.z += dt * 0.3; }
  }
}