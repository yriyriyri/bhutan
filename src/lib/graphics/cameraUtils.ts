import * as THREE from "three";

//project world to ndc and log it for debugging
export function logOriginNDC(tag: string, camera: THREE.Camera) {
  const v = new THREE.Vector3(0, 0, 0);
  v.project(camera as THREE.PerspectiveCamera);
  console.log(`[${tag}] origin NDC`, v.x.toFixed(3), v.y.toFixed(3));
}

//frame scene in perspective then center
export function frameScenePerspective(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  aspect: number,
  fitMargin = 1.2
) {
  // compute bounds
  const box = new THREE.Box3().setFromObject(scene);
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) return; // empty scene
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  //pick a radius to fit
  const radius = 0.5 * Math.max(size.x, size.y, size.z) * fitMargin;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distV = radius / Math.tan(fov / 2);
  const distH = radius / Math.tan(Math.atan(Math.tan(fov / 2) * aspect));
  const dist = Math.max(distV, distH);
  camera.position.set(center.x, center.y, center.z + dist);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.near = Math.max(0.01, dist - radius * 2);
  camera.far = dist + radius * 2 + 100;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}