import {
  Injectable, inject, signal, NgZone, OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneEngine } from '../../../engines/scene/scene.engine';
import { MaterialEngine } from '../../../engines/material/material.engine';
import type { SceneObject } from '../../../core/models/scene.models';
import type { FPWall, FPDoor, FPWindow } from './floor-plan.service';

const PIXELS_PER_METER = 100;

/**
 * RendererService wraps Three.js. It is a pure rendering layer.
 * It reads from SceneEngine and MaterialEngine — it never holds business logic.
 */
@Injectable()
export class RendererService implements OnDestroy {
  private readonly sceneEngine = inject(SceneEngine);
  private readonly materialEngine = inject(MaterialEngine);
  private readonly ngZone = inject(NgZone);

  private renderer!: THREE.WebGLRenderer;
  private threeScene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private animFrameId = 0;
  private meshMap = new Map<string, THREE.Group>();
  private wallMeshMap = new Map<string, THREE.Mesh>();
  private readonly loader = new GLTFLoader();
  private gridHelper!: THREE.GridHelper;

  readonly isReady = signal(false);

  init(canvas: HTMLCanvasElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.setupRenderer(canvas);
      this.setupScene();
      this.setupCamera(canvas);
      this.setupLights();
      this.setupControls(canvas);
      this.isReady.set(true);
      this.loop();
    });
  }

  private floorMeshMap = new Map<string, THREE.Mesh>();

  syncScene(): void {
    if (!this.threeScene) return;
    const objects = this.sceneEngine?.objects() ?? [];
    objects.forEach(obj => this.syncObject(obj));

    const objectIds = new Set(objects.map(o => o.id));
    this.meshMap.forEach((_, id) => {
      if (!objectIds.has(id)) this.removeFromScene(id);
    });
  }

  syncFloorPlan(walls: FPWall[], doors: FPDoor[] = [], windows: FPWindow[] = [], previewWall: FPWall | null = null): void {
    const allWalls = previewWall ? [...walls, previewWall] : walls;
    const wallIds = new Set(allWalls.map(w => w.id));
    const doorIds = new Set(doors.map(d => d.id));
    const winIds  = new Set(windows.map(w => w.id));

    // Remove stale wall meshes
    this.wallMeshMap.forEach((mesh, id) => {
      if (id !== '__floor__' && !wallIds.has(id)) { this.threeScene.remove(mesh); this.wallMeshMap.delete(id); }
    });
    // Remove stale floor meshes (door/window markers stored here)
    this.floorMeshMap.forEach((mesh, id) => {
      if (!doorIds.has(id) && !winIds.has(id)) { this.threeScene.remove(mesh); this.floorMeshMap.delete(id); }
    });

    // Build/update floor slab from bounding box of walls
    if (walls.length >= 2) {
      const allX = walls.flatMap(w => [w.start.x, w.end.x]);
      const allY = walls.flatMap(w => [w.start.y, w.end.y]);
      const minX = Math.min(...allX) / PIXELS_PER_METER;
      const maxX = Math.max(...allX) / PIXELS_PER_METER;
      const minZ = Math.min(...allY) / PIXELS_PER_METER;
      const maxZ = Math.max(...allY) / PIXELS_PER_METER;
      const floorW = maxX - minX, floorD = maxZ - minZ;
      let floor = this.wallMeshMap.get('__floor__');
      if (!floor) {
        floor = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshStandardMaterial({ color: '#C8B89A', roughness: 1.0 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.threeScene.add(floor);
        this.wallMeshMap.set('__floor__', floor);
      }
      floor.scale.set(floorW, floorD, 1);
      floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    }

    for (const wall of allWalls) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue; // skip zero-length walls
      const length = len / PIXELS_PER_METER;
      const height = wall.meta.height / 1000;
      const thickness = wall.meta.thickness / 1000;
      const cx = ((wall.start.x + wall.end.x) / 2) / PIXELS_PER_METER;
      const cz = ((wall.start.y + wall.end.y) / 2) / PIXELS_PER_METER;
      const rotY = -Math.atan2(dy, dx);
      const isPreview = wall.id === '__preview__';

      let mesh = this.wallMeshMap.get(wall.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: wall.meta.color, roughness: 0.9,
          transparent: isPreview, opacity: isPreview ? 0.55 : 1,
        });
        mesh = new THREE.Mesh(geo, mat);
        if (!isPreview) mesh.userData['wallId'] = wall.id;
        mesh.castShadow = !isPreview; mesh.receiveShadow = true;
        this.threeScene.add(mesh);
        this.wallMeshMap.set(wall.id, mesh);
      }
      mesh.scale.set(length, height, thickness);
      mesh.position.set(cx, height / 2, cz);
      mesh.rotation.set(0, rotY, 0);
      (mesh.material as THREE.MeshStandardMaterial).color.set(wall.meta.color);
    }

    const DEG2RAD = Math.PI / 180;
    const WALL_THICK = 0.25; // slightly thicker than 200mm wall so mesh pokes through

    // Doors — brown box filling wall opening
    for (const door of doors) {
      const w = door.meta.width / 1000, h = door.meta.height / 1000;
      const px = door.pos.x / PIXELS_PER_METER, pz = door.pos.y / PIXELS_PER_METER;
      // angle is stored in degrees by nearestWallPoint
      const rotY = -(door.angle * DEG2RAD);
      let mesh = this.floorMeshMap.get(door.id);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({ color: '#8B5E3C', roughness: 0.8 });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        mesh.castShadow = true;
        this.threeScene.add(mesh);
        this.floorMeshMap.set(door.id, mesh);
      }
      mesh.scale.set(w, h, WALL_THICK);
      mesh.position.set(px, h / 2, pz);
      mesh.rotation.set(0, rotY, 0);
    }

    // Windows — semi-transparent blue box filling wall opening
    for (const win of windows) {
      const w = win.meta.width / 1000, h = win.meta.height / 1000;
      const px = win.pos.x / PIXELS_PER_METER, pz = win.pos.y / PIXELS_PER_METER;
      const sillH = win.meta.sillH / 1000;
      const rotY = -(win.angle * DEG2RAD);
      let mesh = this.floorMeshMap.get(win.id);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({ color: '#93C5FD', roughness: 0.1, transparent: true, opacity: 0.5 });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        this.threeScene.add(mesh);
        this.floorMeshMap.set(win.id, mesh);
      }
      mesh.scale.set(w, h, WALL_THICK);
      mesh.position.set(px, sillH + h / 2, pz);
      mesh.rotation.set(0, rotY, 0);
    }
  }

  private syncObject(obj: SceneObject): void {
    let group = this.meshMap.get(obj.id);
    if (!group) {
      group = new THREE.Group();
      group.userData['objectId'] = obj.id;

      // Body placeholder — bright orange box sitting on the floor
      const bodyGeo = new THREE.BoxGeometry(1, 0.8, 0.8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xFF6600, roughness: 0.4, metalness: 0.1,
        emissive: 0xFF3300, emissiveIntensity: 0.4,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      body.receiveShadow = true;
      body.position.y = 0.4; // box center at 0.4m = bottom at y=0

      // Thin vertical pole above the box so it's easy to spot from far away
      const poleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0xFFFFFF, emissiveIntensity: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.4; // pole center at 1.4m

      group.add(body);
      group.add(pole);
      this.threeScene.add(group);
      this.meshMap.set(obj.id, group);
    }
    group.position.set(...obj.position);
    group.rotation.set(...obj.rotation.map(r => THREE.MathUtils.degToRad(r)) as [number, number, number]);
    group.scale.set(...obj.scale);
  }

  loadAsset(objectId: string, glbUrl: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        glbUrl,
        gltf => {
          const group = gltf.scene;
          group.userData['objectId'] = objectId;

          const obj = this.sceneEngine.objects().find(o => o.id === objectId);
          if (obj) {
            group.position.set(...obj.position);
            group.scale.set(...obj.scale);
          }

          this.threeScene.add(group);
          this.meshMap.set(objectId, group);
          resolve(group);
        },
        undefined,
        reject,
      );
    });
  }

  applyMaterialToMesh(objectId: string, meshName: string, materialId: string): void {
    const group = this.meshMap.get(objectId);
    if (!group) return;

    const mat = this.materialEngine.getMaterialById(materialId);
    if (!mat) return;

    group.traverse(child => {
      if (child instanceof THREE.Mesh && child.name === meshName) {
        child.material = mat;
      }
    });
  }

  highlightObject(objectId: string | null): void {
    this.meshMap.forEach((group, id) => {
      group.traverse(child => {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshStandardMaterial).emissive?.set(
            id === objectId ? 0x222222 : 0x000000,
          );
        }
      });
    });
  }

  highlightWall(wallId: string | null): void {
    this.wallMeshMap.forEach((mesh, id) => {
      if (id === '__floor__') return;
      (mesh.material as THREE.MeshStandardMaterial).emissive?.set(
        id === wallId ? 0x334466 : 0x000000,
      );
    });
  }

  pick(event: MouseEvent, canvas: HTMLCanvasElement): { id: string; type: 'object' | 'wall' } | null {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Check furniture first
    const furnitureMeshes: THREE.Object3D[] = [];
    this.meshMap.forEach(group => {
      if (group.userData['objectId']) group.traverse(c => { if (c instanceof THREE.Mesh) furnitureMeshes.push(c); });
    });
    const furnitureHits = raycaster.intersectObjects(furnitureMeshes, false);
    if (furnitureHits.length) {
      let node: THREE.Object3D | null = furnitureHits[0].object;
      while (node && !node.userData['objectId']) node = node.parent;
      const id = node?.userData['objectId'];
      if (id) return { id, type: 'object' };
    }

    // Check walls
    const wallMeshes: THREE.Object3D[] = [];
    this.wallMeshMap.forEach((mesh, id) => {
      if (id !== '__floor__') wallMeshes.push(mesh);
    });
    const wallHits = raycaster.intersectObjects(wallMeshes, false);
    if (wallHits.length) {
      const mesh = wallHits[0].object as THREE.Mesh;
      const wallId = mesh.userData['wallId'] as string;
      if (wallId) return { id: wallId, type: 'wall' };
    }
    return null;
  }

  /** @deprecated Use pick() instead */
  pickObject(event: MouseEvent, canvas: HTMLCanvasElement): string | null {
    const hit = this.pick(event, canvas);
    return hit?.type === 'object' ? hit.id : null;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.controls.dispose();
    this.renderer.dispose();
    this.materialEngine.dispose();
  }

  private setupRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  private setupScene(): void {
    this.threeScene = new THREE.Scene();
    // Sky gradient via canvas texture
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2; skyCanvas.height = 256;
    const ctx = skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#87CEEB');   // sky blue at top
    grad.addColorStop(0.6, '#D4E9F7'); // pale blue
    grad.addColorStop(1, '#E8EDF0');   // horizon haze
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.mapping = THREE.EquirectangularReflectionMapping;
    this.threeScene.background = skyTex;

    // Infinite ground plane (1km × 1km)
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshStandardMaterial({ color: '#8A9E7A', roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.threeScene.add(ground);
    this.threeScene.fog = new THREE.Fog(0xD4E9F7, 30, 150);

    // Infinite-looking grid — 500×500m at 1m spacing, centered at world origin
    this.gridHelper = new THREE.GridHelper(500, 500, 0x888888, 0xCCCCCC);
    this.gridHelper.position.set(0, 0.01, 0);
    // material can be Material | Material[] — handle both cases
    const mats = Array.isArray(this.gridHelper.material)
      ? this.gridHelper.material
      : [this.gridHelper.material];
    mats.forEach(m => { m.transparent = true; m.opacity = 0.4; });
    this.threeScene.add(this.gridHelper);
  }

  setGridVisible(v: boolean): void { if (this.gridHelper) this.gridHelper.visible = v; }

  private setupCamera(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 600;
    this.camera = new THREE.PerspectiveCamera(
      50,
      w / h,
      0.1,
      200,
    );
    // Position camera INSIDE the room near the top-left corner so walls
    // don't block the view — default room spans X:1-6m, Z:1-5m
    this.camera.position.set(1.8, 2.5, 1.8);
    this.camera.lookAt(3.5, 0.8, 3.0);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.threeScene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
    sun.position.set(5, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.1;
    sun.shadow.camera.far = 50;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    this.threeScene.add(sun);

    const fill = new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.5);
    this.threeScene.add(fill);
  }

  private setupControls(canvas: HTMLCanvasElement): void {
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 20;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(3.5, 0.8, 3.0);
    this.controls.maxDistance = 30;
  }

  private removeFromScene(id: string): void {
    const group = this.meshMap.get(id);
    if (group) {
      this.threeScene.remove(group);
      this.meshMap.delete(id);
    }
  }

  private loop(): void {
    this.animFrameId = requestAnimationFrame(() => this.loop());
    if (!this.controls || !this.renderer || !this.threeScene) return;
    this.controls.update();
    this.syncScene();
    this.renderer.render(this.threeScene, this.camera);
  }
}
