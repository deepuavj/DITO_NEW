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
    // Only sync furniture objects — room/walls come from syncFloorPlan
    const objects = this.sceneEngine.objects();
    objects.forEach(obj => this.syncObject(obj));

    const objectIds = new Set(objects.map(o => o.id));
    this.meshMap.forEach((_, id) => {
      if (!objectIds.has(id)) this.removeFromScene(id);
    });
  }

  syncFloorPlan(walls: FPWall[], doors: FPDoor[] = [], windows: FPWindow[] = []): void {
    const wallIds = new Set(walls.map(w => w.id));
    const doorIds = new Set(doors.map(d => d.id));
    const winIds  = new Set(windows.map(w => w.id));

    // Remove stale wall meshes
    this.wallMeshMap.forEach((mesh, id) => {
      if (!wallIds.has(id)) { this.threeScene.remove(mesh); this.wallMeshMap.delete(id); }
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

    for (const wall of walls) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const length = Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_METER;
      const height = wall.meta.height / 1000;
      const thickness = wall.meta.thickness / 1000;
      const cx = ((wall.start.x + wall.end.x) / 2) / PIXELS_PER_METER;
      const cz = ((wall.start.y + wall.end.y) / 2) / PIXELS_PER_METER;
      const rotY = -Math.atan2(dy, dx);

      let mesh = this.wallMeshMap.get(wall.id);
      if (!mesh) {
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: wall.meta.color, roughness: 0.9 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true; mesh.receiveShadow = true;
        this.threeScene.add(mesh);
        this.wallMeshMap.set(wall.id, mesh);
      }
      mesh.scale.set(length, height, thickness);
      mesh.position.set(cx, height / 2, cz);
      mesh.rotation.set(0, rotY, 0);
      (mesh.material as THREE.MeshStandardMaterial).color.set(wall.meta.color);
    }

    // Doors — brown frame box
    for (const door of doors) {
      const w = door.meta.width / 1000, h = door.meta.height / 1000;
      const px = door.pos.x / PIXELS_PER_METER, pz = door.pos.y / PIXELS_PER_METER;
      let mesh = this.floorMeshMap.get(door.id);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({ color: '#8B5E3C', roughness: 0.8 });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.05), mat);
        mesh.castShadow = true;
        this.threeScene.add(mesh);
        this.floorMeshMap.set(door.id, mesh);
      }
      mesh.scale.set(w, h, 1);
      mesh.position.set(px, h / 2, pz);
      mesh.rotation.set(0, -door.angle, 0);
    }

    // Windows — blue-tinted glass box
    for (const win of windows) {
      const w = win.meta.width / 1000, h = win.meta.height / 1000;
      const px = win.pos.x / PIXELS_PER_METER, pz = win.pos.y / PIXELS_PER_METER;
      const sillH = win.meta.sillH / 1000;
      let mesh = this.floorMeshMap.get(win.id);
      if (!mesh) {
        const mat = new THREE.MeshStandardMaterial({ color: '#93C5FD', roughness: 0.1, transparent: true, opacity: 0.45 });
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.04), mat);
        this.threeScene.add(mesh);
        this.floorMeshMap.set(win.id, mesh);
      }
      mesh.scale.set(w, h, 1);
      mesh.position.set(px, sillH + h / 2, pz);
      mesh.rotation.set(0, -win.angle, 0);
    }
  }

  private syncObject(obj: SceneObject): void {
    let group = this.meshMap.get(obj.id);
    if (!group) {
      group = new THREE.Group();
      group.userData['objectId'] = obj.id;
      const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.y = 0.4;
      group.add(mesh);
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

  pickObject(event: MouseEvent, canvas: HTMLCanvasElement): string | null {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const meshes: THREE.Object3D[] = [];
    this.meshMap.forEach(group => {
      if (group.userData['objectId']) group.traverse(c => { if (c instanceof THREE.Mesh) meshes.push(c); });
    });

    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;

    let node: THREE.Object3D | null = hits[0].object;
    while (node && !node.userData['objectId']) node = node.parent;
    return node?.userData['objectId'] ?? null;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  private setupScene(): void {
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0xE8E8E0);
    this.threeScene.fog = new THREE.Fog(0xE8E8E0, 15, 30);
  }

  private setupCamera(canvas: HTMLCanvasElement): void {
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(4, 4, 6);
    this.camera.lookAt(0, 0, 0);
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
    this.controls.target.set(0, 0.5, 0);
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
    this.controls.update();
    this.renderer.render(this.threeScene, this.camera);
  }
}
