import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseSceneLayer } from './BaseSceneLayer';
import type { FrameSpec } from '../sizing';
import POST_VERT from '../shaders/ssOutline.vert.glsl'
import POST_FRAG from '../shaders/ssOutline.frag.glsl'
import P_VERT from '../shaders/dragonParticles.vert.glsl'
import P_FRAG from '../shaders/dragonParticles.frag.glsl'
import { PMREMGenerator } from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export class DragonSceneLayer extends BaseSceneLayer {
  private mixer?: THREE.AnimationMixer;
  private root?: THREE.Object3D;

  private sceneRT!: THREE.WebGLRenderTarget;

  // post chain
  private postMat!: THREE.ShaderMaterial;
  private postScene!: THREE.Scene;
  private postCam!: THREE.OrthographicCamera;
  private postQuad!: THREE.Mesh;

  private points!: THREE.Points;
  private pGeom!: THREE.BufferGeometry;
  private pMat!: THREE.ShaderMaterial;

  private MAX_PARTICLES = 12000;

  // cpu particle state
  private pPos!: Float32Array; 
  private pVel!: Float32Array; 
  private pLife!: Float32Array; 
  private pSize!: Float32Array;  
  private pCursor = 0;      

  // particle  dials
  private ratePerBone = 80;       
  private speedForMaxRate = 4.0;  
  private inheritFactor = 0.9; 
  private jitter = 0.6;           
  private drag = 1.5;  
  private gravity = new THREE.Vector3(0, -2.0, 0); 
  private sizeMin = 0.02;  
  private sizeMax = 0.06;   
  private lifeMin = 0.35;
  private lifeMax = 1.1;
  private particleOpacity = 1.0; 

  private minRateBaseline = 5;
  private particleColor = new THREE.Color(0x000000); 

  private bones: THREE.Object3D[] = [];
  private bonePrev!: THREE.Vector3[]; 

  private _spawnedThisFrame = 0;
  private _lastLog = 0;

  constructor(
    id: string,
    renderer: THREE.WebGLRenderer,
    private url: string = '/dragon.glb'
  ) {
    super(id, renderer);

    this.postMat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        uScene: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uExposure: { value: 1.0 },
        uContrast: { value: 1.8 },
        uOutlinePx: { value: 5.0 },
        uOutlineColor: { value: new THREE.Color(0x000000) },
        uOutlineOpacity: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postQuad  = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat);
    this.postScene.add(this.postQuad);
  }

  //orb 

  private replaceMaterialByName(
    root: THREE.Object3D,
    targetName: string,
    make: (mesh: THREE.Mesh) => THREE.Material
  ) {
    const want = targetName.trim().toLowerCase();
    let replaced = 0;

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh || !(mesh as any).isMesh) return;

      const swap = (m: THREE.Material | null | undefined, idx?: number) => {
        if (!m) return;
        const name = (m.name || '').trim().toLowerCase();
        if (name !== want) return;

        const newMat = make(mesh);
        if ((mesh as any).isSkinnedMesh && 'skinning' in newMat) {
          (newMat as any).skinning = true;
        }

        if (Array.isArray(mesh.material)) {
          mesh.material[idx!] = newMat;
        } else {
          mesh.material = newMat;
        }

        m.dispose();
        replaced++;
      };

      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m, i) => swap(m, i));
      } else {
        swap(mesh.material);
      }
    });

    console.log(`[${this.id}] Replaced ${replaced} material(s) named "${targetName}".`);
  }

  protected build(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {

    if (!(this as any).particleColor) this.particleColor = new THREE.Color(0x000000);
    if (typeof this.particleOpacity !== 'number') this.particleOpacity = 1.0;
    if (typeof this.MAX_PARTICLES !== 'number' || this.MAX_PARTICLES <= 0) this.MAX_PARTICLES = 12000;

    scene.background = null;

    const ambient = new THREE.AmbientLight(0xffffff, 2.0);
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(3, 5, 4);
    scene.add(ambient, dir);

    const pmrem = new PMREMGenerator(this.renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    if (!this.points) this.initParticlePool();
    scene.add(this.points);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      this.url || '/dragon.glb',
      (gltf) => {
        this.root = gltf.scene;

        const box = new THREE.Box3().setFromObject(this.root);
        const center = box.getCenter(new THREE.Vector3());
        this.root.position.sub(center);

        this.root.position.y -= 1.6;
        this.root.position.z -= 12.0;

        scene.add(this.root);

        this.replaceMaterialByName(this.root, 'orb', (mesh) => {
          const mat = new THREE.MeshPhysicalMaterial({
            name: 'orb_metallic_repl',
            color: 0xffffff,
            metalness: 1.0,
            roughness: 0.05,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.03,
            emissive: 0x222222,
            emissiveIntensity: 0.4,
          });
          if ((mesh as any).isSkinnedMesh) (mat as any).skinning = true;
          return mat;
        });

        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.root);
          const action = this.mixer.clipAction(gltf.animations[0]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
        }

        this.collectBones(this.root);
      },
      undefined,
      (err) => console.warn(`[${this.id}] glTF load error:`, err)
    );
  }

  private initParticlePool() {
    const maxN   = (typeof this.MAX_PARTICLES === 'number' && this.MAX_PARTICLES > 0) ? this.MAX_PARTICLES : 12000;
    const opacity = (typeof this.particleOpacity === 'number') ? this.particleOpacity : 1.0;
    const col     = (this.particleColor instanceof THREE.Color) ? this.particleColor : new THREE.Color(0x000000);
    this.MAX_PARTICLES   = maxN;
    this.particleOpacity = opacity;
    this.particleColor   = col;
  
    // cpu arrays
    this.pPos  = new Float32Array(maxN * 3);
    this.pVel  = new Float32Array(maxN * 3);
    this.pLife = new Float32Array(maxN);
    this.pSize = new Float32Array(maxN);
  
    // gpu geom
    this.pGeom = new THREE.BufferGeometry();
    const posAttr  = new THREE.BufferAttribute(new Float32Array(maxN * 3), 3);
    const sizeAttr = new THREE.BufferAttribute(new Float32Array(maxN), 1);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    this.pGeom.setAttribute('position', posAttr);
    this.pGeom.setAttribute('aSize', sizeAttr);
    this.pGeom.setDrawRange(0, 0);
  
    // material
    this.pMat = new THREE.ShaderMaterial({
      vertexShader: P_VERT,
      fragmentShader: P_FRAG,
      uniforms: {
        uOpacity:   { value: opacity },
        uSizeScale: { value: 700.0 },
        uColor:     { value: col.clone() }, 
      },
      transparent: true,
      depthWrite: true,
      depthTest: true,
    });
  
    this.points = new THREE.Points(this.pGeom, this.pMat);
    this.points.frustumCulled = false;
  }

  public setParticleParams(opts: Partial<{
    ratePerBone: number;
    speedForMaxRate: number;
    inheritFactor: number;
    jitter: number;
    drag: number;
    gravity: THREE.Vector3 | [number, number, number];
    sizeMin: number; sizeMax: number;
    lifeMin: number; lifeMax: number;
    opacity: number;
    minRateBaseline: number;
  }>) {
    if (opts.ratePerBone !== undefined) this.ratePerBone = opts.ratePerBone;
    if (opts.speedForMaxRate !== undefined) this.speedForMaxRate = opts.speedForMaxRate;
    if (opts.inheritFactor !== undefined) this.inheritFactor = opts.inheritFactor;
    if (opts.jitter !== undefined) this.jitter = opts.jitter;
    if (opts.drag !== undefined) this.drag = opts.drag;
    if (opts.gravity !== undefined) {
      const g = opts.gravity as any;
      if (Array.isArray(g)) this.gravity.set(g[0], g[1], g[2]); else this.gravity.copy(g);
    }
    if (opts.sizeMin !== undefined) this.sizeMin = opts.sizeMin;
    if (opts.sizeMax !== undefined) this.sizeMax = opts.sizeMax;
    if (opts.lifeMin !== undefined) this.lifeMin = opts.lifeMin;
    if (opts.lifeMax !== undefined) this.lifeMax = opts.lifeMax;
    if (opts.opacity !== undefined && this.pMat) {
      this.particleOpacity = THREE.MathUtils.clamp(opts.opacity, 0, 1);
      this.pMat.uniforms.uOpacity.value = this.particleOpacity;
    }
    if (opts.minRateBaseline !== undefined) this.minRateBaseline = Math.max(0, opts.minRateBaseline);
  }

  public setParticleColor(c: THREE.Color | number | string){
    const col = c instanceof THREE.Color ? c : new THREE.Color(c as any);
    this.particleColor.copy(col);
    if (this.pMat) (this.pMat.uniforms.uColor.value as THREE.Color).copy(col);
  }

  // find all bones under root (unique)
  private collectBones(root: THREE.Object3D) {
    const set = new Set<THREE.Object3D>();
    root.traverse((obj) => {
      if ((obj as any).isBone) set.add(obj);
      const sm = obj as THREE.SkinnedMesh;
      if (sm && (sm as any).isSkinnedMesh && sm.skeleton) {
        sm.skeleton.bones.forEach(b => set.add(b));
      }
    });
    this.bones = Array.from(set);
    this.bonePrev = this.bones.map(() => new THREE.Vector3());
    // initialize previous positions now
    this.scene.updateMatrixWorld(true);
    this.bones.forEach((b, i) => b.getWorldPosition(this.bonePrev[i]));
    console.log(`[${this.id}] bones tracked:`, this.bones.length);
  }

  private emitFromBone(bone: THREE.Object3D, boneVel: THREE.Vector3, dt: number) {
    // spawn based on speed 
    const speed = boneVel.length();
    const speedN = THREE.MathUtils.clamp(speed / this.speedForMaxRate, 0, 1);
    const spawn = (this.ratePerBone * speedN + this.minRateBaseline) * dt;  
    const count = Math.floor(spawn) + (Math.random() < (spawn % 1) ? 1 : 0);
    if (count <= 0) return;

    const pos = new THREE.Vector3();
    bone.getWorldPosition(pos);

    for (let n = 0; n < count; n++) {
      const i = this.pCursor;
      this.pCursor = (this.pCursor + 1) % this.MAX_PARTICLES;

      // position
      this.pPos[i*3+0] = pos.x;
      this.pPos[i*3+1] = pos.y;
      this.pPos[i*3+2] = pos.z;

      // initial velocity  inherit + jitter
      const jitterDir = new THREE.Vector3(
        (Math.random()*2-1),
        (Math.random()*2-1),
        (Math.random()*2-1)
      ).normalize();
      const j = this.jitter * (0.5 + 0.5 * speedN); 
      const v = new THREE.Vector3().copy(boneVel).multiplyScalar(this.inheritFactor).addScaledVector(jitterDir, j);

      this.pVel[i*3+0] = v.x;
      this.pVel[i*3+1] = v.y;
      this.pVel[i*3+2] = v.z;

      const t = 0.3 + 0.7 * (speedN * speedN);
      this.pSize[i] = THREE.MathUtils.lerp(this.sizeMin, this.sizeMax, t);
      this.pLife[i] = THREE.MathUtils.lerp(this.lifeMin, this.lifeMax, Math.sqrt(Math.max(0.1, speedN)));
      this._spawnedThisFrame++;
    }
  }

  private simParticles(dtIn: number) {
    const dt = dtIn > 0 ? dtIn : 1/60;
    const N = this.MAX_PARTICLES;
    const g = this.gravity;

    const posAttr  = this.pGeom.attributes.position as THREE.BufferAttribute;
    const sizeAttr = this.pGeom.attributes.aSize as THREE.BufferAttribute;

    let alive = 0;

    for (let i = 0; i < N; i++) {
      let life = this.pLife[i];
      if (life <= 0) continue;

      let vx = this.pVel[i*3+0];
      let vy = this.pVel[i*3+1];
      let vz = this.pVel[i*3+2];

      const damp = Math.exp(-this.drag * dt);
      vx = vx * damp + g.x * dt;
      vy = vy * damp + g.y * dt;
      vz = vz * damp + g.z * dt;

      this.pVel[i*3+0] = vx;
      this.pVel[i*3+1] = vy;
      this.pVel[i*3+2] = vz;

      const px = this.pPos[i*3+0] + vx * dt;
      const py = this.pPos[i*3+1] + vy * dt;
      const pz = this.pPos[i*3+2] + vz * dt;

      this.pPos[i*3+0] = px;
      this.pPos[i*3+1] = py;
      this.pPos[i*3+2] = pz;

      life -= dt;
      this.pLife[i] = life;
      if (life <= 0) continue;

      const d3 = alive * 3;
      (posAttr.array as Float32Array)[d3+0] = px;
      (posAttr.array as Float32Array)[d3+1] = py;
      (posAttr.array as Float32Array)[d3+2] = pz;

      (sizeAttr.array as Float32Array)[alive] = this.pSize[i];

      alive++;
    }

    this.pGeom.setDrawRange(0, alive);
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    const now = performance.now();
    if (now - this._lastLog > 250) {
      this._spawnedThisFrame = 0;
      this._lastLog = now;
    }
  }

  public debugBurst(count = 200) {
    const center = new THREE.Vector3(0, -1.6, -12);
    for (let n = 0; n < count; n++) {
      const i = this.pCursor;
      this.pCursor = (this.pCursor + 1) % this.MAX_PARTICLES;

      this.pPos[i*3+0] = center.x;
      this.pPos[i*3+1] = center.y;
      this.pPos[i*3+2] = center.z;

      const dir = new THREE.Vector3(
        (Math.random()*2-1),
        (Math.random()*2-1),
        (Math.random()*2-1)
      ).normalize().multiplyScalar(2.0);
      this.pVel[i*3+0] = dir.x;
      this.pVel[i*3+1] = dir.y;
      this.pVel[i*3+2] = dir.z;

      this.pSize[i] = 2.5;
      this.pLife[i] = 8.0;
    }
  }

  update(_time: number, dt: number): void {
    // advance animation
    this.mixer?.update(dt);

    this.scene.updateMatrixWorld(true);

    if (this.bones.length > 0) {
      const curr = new THREE.Vector3();
      for (let i = 0; i < this.bones.length; i++) {
        const b = this.bones[i];
        const prev = this.bonePrev[i];
        b.getWorldPosition(curr);
        const invDt = dt > 0 ? (1/dt) : 60.0;
        const vel = new THREE.Vector3(
          (curr.x - prev.x) * invDt,
          (curr.y - prev.y) * invDt,
          (curr.z - prev.z) * invDt
        );
        this.emitFromBone(b, vel, dt > 0 ? dt : 1/60);
        prev.copy(curr);
      }
    }

    this.simParticles(dt);
  }

  resize(spec: FrameSpec): void {
    super.resize(spec);

    this.sceneRT?.dispose();
    this.sceneRT = new THREE.WebGLRenderTarget(spec.pxW, spec.pxH, {
      depthBuffer: true,
      stencilBuffer: false,
      generateMipmaps: false,
      type: THREE.UnsignedByteType,
    });

    (this.postMat.uniforms.uResolution.value as THREE.Vector2).set(spec.pxW, spec.pxH);

    if (this.pMat) {
      const sizeScale = spec.pxH / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5)));
      this.pMat.uniforms.uSizeScale.value = sizeScale;
    }

    this.camera.lookAt(0, 0, 0);
  }

  render(): THREE.WebGLRenderTarget {
    const pr = this.renderer.getPixelRatio();

    const prevCol = new THREE.Color();
    this.renderer.getClearColor(prevCol);
    const prevAlpha = (this.renderer as any).getClearAlpha ? (this.renderer as any).getClearAlpha() : 0;

    this.renderer.setRenderTarget(this.sceneRT);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.sceneRT.width / pr, this.sceneRT.height / pr);
    this.renderer.setClearColor(0x000000, 0.0);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setClearColor(prevCol, prevAlpha);

    this.postMat.uniforms.uScene.value = this.sceneRT.texture;

    this.renderer.setRenderTarget(this.rt);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.rt.width / pr, this.rt.height / pr);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.postScene, this.postCam);

    return this.rt;
  }

  dispose(): void {
    this.mixer = undefined;
    this.sceneRT?.dispose();
    (this.postQuad.geometry as THREE.BufferGeometry).dispose();
    this.postMat.dispose();
    this.pGeom?.dispose();
    this.pMat?.dispose();
    super.dispose();
  }

  public setExposure(x: number){ this.postMat.uniforms.uExposure.value = x; }
  public setContrast(x: number){ this.postMat.uniforms.uContrast.value = x; }
  public setOutline(opts: { widthPx?: number; color?: THREE.Color | number | string; opacity?: number }) {
    const u = this.postMat.uniforms;
    if (opts.widthPx  !== undefined) u.uOutlinePx.value      = Math.max(0, opts.widthPx);
    if (opts.opacity  !== undefined) u.uOutlineOpacity.value = THREE.MathUtils.clamp(opts.opacity, 0, 1);
    if (opts.color    !== undefined) {
      const c = new THREE.Color(opts.color as any);
      (u.uOutlineColor.value as THREE.Color).copy(c);
    }
  }
  public setParticleParamsExternal(opts: Parameters<DragonSceneLayer['setParticleParams']>[0]) {
    this.setParticleParams(opts);
  }
}