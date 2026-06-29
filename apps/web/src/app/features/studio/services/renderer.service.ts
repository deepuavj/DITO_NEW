import {
  Injectable, inject, signal, NgZone, OnDestroy,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SceneEngine } from '../../../engines/scene/scene.engine';
import { MaterialEngine } from '../../../engines/material/material.engine';
import { MetadataEngine } from '../../../engines/metadata/metadata.engine';
import type { SceneObject } from '../../../core/models/scene.models';
import type { FPWall, FPDoor, FPWindow, FPArc, FPRoom } from './floor-plan.service';

const PIXELS_PER_METER = 100;

/**
 * RendererService wraps Three.js. It is a pure rendering layer.
 * It reads from SceneEngine and MaterialEngine — it never holds business logic.
 */
@Injectable()
export class RendererService implements OnDestroy {
  private readonly sceneEngine = inject(SceneEngine);
  private readonly materialEngine = inject(MaterialEngine);
  private readonly metadataEngine = inject(MetadataEngine);
  private readonly ngZone = inject(NgZone);
  private readonly loadingSet = new Set<string>(); // prevent duplicate loads

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
  private arcMeshMap = new Map<string, THREE.Mesh[]>(); // arcId → segment meshes

  private dragState: {
    objectId: string;
    mode: 'move' | 'rotate' | 'scale';
    plane: THREE.Plane;
    startMouseX: number;
    startMouseY: number;
    startRotY: number;
    startScale: [number, number, number];
  } | null = null;

  get isDragging(): boolean { return this.dragState !== null; }

  beginDrag(event: PointerEvent, canvas: HTMLCanvasElement, mode: 'move' | 'rotate' | 'scale'): boolean {
    const hit = this.pick(event as unknown as MouseEvent, canvas);
    if (!hit || hit.type !== 'object') return false;
    const obj = this.sceneEngine.objects().find(o => o.id === hit.id);
    if (!obj) return false;
    this.controls.enabled = false;
    const rect = canvas.getBoundingClientRect();
    // Horizontal plane at object floor level for move raycasting
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -obj.position[1]);
    this.dragState = {
      objectId: hit.id,
      mode,
      plane: dragPlane,
      startMouseX: event.clientX - rect.left,
      startMouseY: event.clientY - rect.top,
      startRotY: obj.rotation[1],
      startScale: [...obj.scale] as [number, number, number],
    };
    return true;
  }

  updateDrag(event: PointerEvent, canvas: HTMLCanvasElement): void {
    if (!this.dragState) return;
    const { objectId, mode, plane, startMouseX, startMouseY, startRotY, startScale } = this.dragState;
    const obj = this.sceneEngine.objects().find(o => o.id === objectId);
    if (!obj) return;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;

    if (mode === 'move') {
      const nx = (mx / rect.width) * 2 - 1;
      const ny = -(my / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
      const pt = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, pt)) {
        this.sceneEngine.updateObject(objectId, { position: [pt.x, obj.position[1], pt.z] });
      }
    } else if (mode === 'rotate') {
      const dx = mx - startMouseX;
      const rotation = [...obj.rotation] as [number, number, number];
      rotation[1] = startRotY + dx * 0.5; // 0.5 deg per pixel
      this.sceneEngine.updateObject(objectId, { rotation });
    } else if (mode === 'scale') {
      const dy = my - startMouseY;
      const factor = Math.max(0.1, 1 - dy * 0.008);
      this.sceneEngine.updateObject(objectId, {
        scale: [startScale[0] * factor, startScale[1] * factor, startScale[2] * factor],
      });
    }
  }

  endDrag(): void {
    if (!this.dragState) return;
    this.controls.enabled = true;
    this.dragState = null;
  }

  syncScene(): void {
    if (!this.threeScene) return;
    const objects = this.sceneEngine?.objects() ?? [];
    objects.forEach(obj => this.syncObject(obj));

    const objectIds = new Set(objects.map(o => o.id));
    this.meshMap.forEach((_, id) => {
      if (!objectIds.has(id)) this.removeFromScene(id);
    });
  }

  syncFloorPlan(walls: FPWall[], doors: FPDoor[] = [], windows: FPWindow[] = [], previewWall: FPWall | null = null, arcs: FPArc[] = [], rooms: FPRoom[] = []): void {
    const allWalls = previewWall ? [...walls, previewWall] : walls;
    const wallIds = new Set(allWalls.map(w => w.id));
    const doorIds = new Set(doors.map(d => d.id));
    const winIds  = new Set(windows.map(w => w.id));
    const arcIds  = new Set(arcs.map(a => a.id));

    // Remove stale arc meshes
    this.arcMeshMap.forEach((segs, id) => {
      if (!arcIds.has(id)) { segs.forEach(m => this.threeScene.remove(m)); this.arcMeshMap.delete(id); }
    });

    // Remove stale wall meshes
    this.wallMeshMap.forEach((mesh, id) => {
      if (!id.startsWith('__floor__') && !wallIds.has(id)) { this.threeScene.remove(mesh); this.wallMeshMap.delete(id); }
    });
    // Remove stale floor meshes (door/window markers stored here)
    this.floorMeshMap.forEach((mesh, id) => {
      if (!doorIds.has(id) && !winIds.has(id)) { this.threeScene.remove(mesh); this.floorMeshMap.delete(id); }
    });

    // Build/update per-room floor polygons (ShapeGeometry from detected rooms)
    // Track which room floor IDs are current
    const roomFloorIds = new Set(rooms.map((_r, i) => `__floor__${i}`));
    // Remove stale room floors
    this.wallMeshMap.forEach((mesh, id) => {
      if (id.startsWith('__floor__') && !roomFloorIds.has(id)) {
        this.threeScene.remove(mesh);
        this.wallMeshMap.delete(id);
      }
    });

    if (rooms.length > 0) {
      // Build one floor mesh per detected room
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const key  = `__floor__${i}`;
        const poly  = room.polygon;
        // 2D canvas: X right, Y down (pixel coords).
        // Walls use: world X = pixel_x/PPM, world Z = pixel_y/PPM (both positive).
        // ShapeGeometry lives in local XY. Rotating +PI/2 around X maps shape Y → world +Z,
        // matching the wall Z convention. (-PI/2 would map shape Y → world -Z, wrong side.)
        const shape = new THREE.Shape();
        shape.moveTo(poly[0].x / PIXELS_PER_METER, poly[0].y / PIXELS_PER_METER);
        for (let j = 1; j < poly.length; j++) {
          shape.lineTo(poly[j].x / PIXELS_PER_METER, poly[j].y / PIXELS_PER_METER);
        }
        shape.closePath();

        let floor = this.wallMeshMap.get(key);
        if (!floor) {
          const mat = new THREE.MeshStandardMaterial({
            color: room.floorColor, roughness: 0.95, side: THREE.DoubleSide,
          });
          floor = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
          floor.rotation.x = Math.PI / 2; // +PI/2: shape Y → world +Z (matches wall Z axis)
          floor.position.y = 0;           // ground plane is at -0.05, no z-fighting
          floor.receiveShadow = true;
          this.threeScene.add(floor);
          this.wallMeshMap.set(key, floor);
        } else {
          floor.geometry.dispose();
          floor.geometry = new THREE.ShapeGeometry(shape);
        }
        (floor.material as THREE.MeshStandardMaterial).color.set(room.floorColor);
      }
    } else if (walls.length >= 2) {
      // Fallback: bounding box floor when no rooms detected yet
      const allX = walls.flatMap(w => [w.start.x, w.end.x]);
      const allY = walls.flatMap(w => [w.start.y, w.end.y]);
      const minX = Math.min(...allX) / PIXELS_PER_METER;
      const maxX = Math.max(...allX) / PIXELS_PER_METER;
      const minZ = Math.min(...allY) / PIXELS_PER_METER;
      const maxZ = Math.max(...allY) / PIXELS_PER_METER;
      const floorW = maxX - minX, floorD = maxZ - minZ;
      const key = '__floor__bb';
      let floor = this.wallMeshMap.get(key);
      if (!floor) {
        floor = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshStandardMaterial({ color: '#C8B89A', roughness: 1.0 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.threeScene.add(floor);
        this.wallMeshMap.set(key, floor);
      }
      floor.scale.set(floorW, floorD, 1);
      floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2); // Y=0, ground is at -0.05
      roomFloorIds.add(key);
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

    // Curved walls — tessellate each quadratic bezier into segments
    const ARC_SEGS = 16;
    for (const arc of arcs) {
      const height = arc.meta.height / 1000;
      const thickness = arc.meta.thickness / 1000;
      const existing = this.arcMeshMap.get(arc.id);

      // Sample bezier: P(t) = (1-t)²·P0 + 2t(1-t)·P1 + t²·P2
      const pts: [number, number][] = [];
      for (let i = 0; i <= ARC_SEGS; i++) {
        const t = i / ARC_SEGS;
        const u = 1 - t;
        const x = u * u * arc.start.x + 2 * u * t * arc.ctrl.x + t * t * arc.end.x;
        const y = u * u * arc.start.y + 2 * u * t * arc.ctrl.y + t * t * arc.end.y;
        pts.push([x / PIXELS_PER_METER, y / PIXELS_PER_METER]);
      }

      const segs: THREE.Mesh[] = existing ?? [];
      if (!existing) {
        for (let i = 0; i < ARC_SEGS; i++) {
          const mat = new THREE.MeshStandardMaterial({ color: arc.meta.color, roughness: 0.9 });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
          mesh.castShadow = true; mesh.receiveShadow = true;
          this.threeScene.add(mesh);
          segs.push(mesh);
        }
        this.arcMeshMap.set(arc.id, segs);
      }

      for (let i = 0; i < ARC_SEGS; i++) {
        const [x0, z0] = pts[i];
        const [x1, z1] = pts[i + 1];
        const dx = x1 - x0, dz = z1 - z0;
        const segLen = Math.sqrt(dx * dx + dz * dz) || 0.001;
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const rotY = -Math.atan2(dz, dx);
        segs[i].scale.set(segLen, height, thickness);
        segs[i].position.set(cx, height / 2, cz);
        segs[i].rotation.set(0, rotY, 0);
        (segs[i].material as THREE.MeshStandardMaterial).color.set(arc.meta.color);
      }
    }
  }

  private syncObject(obj: SceneObject): void {
    let group = this.meshMap.get(obj.id);

    // If no mesh yet, check for a real GLB URL first
    if (!group) {
      const glbUrl = this.metadataEngine.getGlbUrl(obj.assetId);
      if (glbUrl && !this.loadingSet.has(obj.id)) {
        this.loadingSet.add(obj.id);
        // Temporary grey cube while GLB loads
        const loadingMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x555577 }));
        loadingMesh.position.y = 0.3;
        group = new THREE.Group(); group.userData['objectId'] = obj.id; group.add(loadingMesh);
        this.threeScene.add(group);
        this.meshMap.set(obj.id, group);

        this.loader.load(
          glbUrl,
          gltf => {
            // Replace placeholder with real model
            const old = this.meshMap.get(obj.id);
            if (old) this.threeScene.remove(old);

            const realGroup = gltf.scene;
            realGroup.userData['objectId'] = obj.id;

            // Auto-scale: fit within a 2m bounding box
            const box = new THREE.Box3().setFromObject(realGroup);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const targetSize = 1.0; // 1 meter
            const scaleFactor = targetSize / maxDim;
            realGroup.scale.setScalar(scaleFactor);

            // Initial Y offset so geometry sits with min at y=0; resolveSnapY adjusts later
            const box2 = new THREE.Box3().setFromObject(realGroup);
            realGroup.position.y = -box2.min.y;

            realGroup.traverse(child => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            this.threeScene.add(realGroup);
            this.meshMap.set(obj.id, realGroup);
            this.loadingSet.delete(obj.id);

            // Apply current transform with snap-aware Y
            const current = this.sceneEngine.objects().find(o => o.id === obj.id);
            if (current) {
              const snapY = this.resolveSnapY(obj.assetId, realGroup);
              realGroup.position.set(current.position[0], snapY, current.position[2]);
              this.applyWallSnap(obj.assetId, realGroup, current.position[0], current.position[2]);
              realGroup.rotation.set(...current.rotation.map(r => THREE.MathUtils.degToRad(r)) as [number, number, number]);
            }
          },
          undefined,
          err => {
            console.error('[DITO] GLB load error:', err);
            this.loadingSet.delete(obj.id);
          },
        );
      } else if (!group) {
        group = this.buildFurnitureMesh(obj.id, obj.assetId);
        this.threeScene.add(group);
        this.meshMap.set(obj.id, group);
      }
    }

    group = this.meshMap.get(obj.id);
    if (!group) return;

    const snapY = this.resolveSnapY(obj.assetId, group);
    group.position.set(obj.position[0], snapY, obj.position[2]);
    this.applyWallSnap(obj.assetId, group, obj.position[0], obj.position[2]);
    group.rotation.set(...obj.rotation.map(r => THREE.MathUtils.degToRad(r)) as [number, number, number]);
    if (this.loadingSet.has(obj.id)) return;
    group.scale.set(...obj.scale);
  }

  /** Return the correct world-Y for an object based on its snapRules */
  private resolveSnapY(assetId: string, group: THREE.Group): number {
    const snap = this.metadataEngine.getSnapRule(assetId);
    const surface = snap?.surface ?? 'floor';
    const box = new THREE.Box3().setFromObject(group);
    const objHeight = box.max.y - box.min.y || 0;

    if (surface === 'ceiling') {
      // Hang from ceiling: top of object at ceiling height
      const roomH = this.roomHeightM();
      return roomH - objHeight + Math.abs(box.min.y);
    }
    if (surface === 'wall') {
      // Mid-wall — keep Y as-is (set at drop time to roomH/2)
      return group.position.y || this.roomHeightM() / 2;
    }
    // floor / surface: sit on floor
    return -box.min.y;
  }

  /** Push wall-snapped objects against the nearest wall and orient them inward */
  private applyWallSnap(assetId: string, group: THREE.Group, wx: number, wz: number): void {
    const snap = this.metadataEngine.getSnapRule(assetId);
    if (snap?.surface !== 'wall') return;

    // Find nearest wall centre from the Three.js wall meshes
    let best: { dist: number; angle: number; px: number; pz: number } | null = null;
    this.wallMeshMap.forEach((m, id) => {
      if (id.startsWith('__floor__')) return;
      const dx = wx - m.position.x, dz = wz - m.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (!best || dist < best.dist) {
        best = { dist, angle: m.rotation.y, px: m.position.x, pz: m.position.z };
      }
    });
    if (!best) return;

    const b = best as { dist: number; angle: number; px: number; pz: number };
    // Normal pointing away from wall face (inward toward room)
    const nx = Math.sin(b.angle);
    const nz = Math.cos(b.angle);

    // Half-depth of object along its local Z axis
    const box = new THREE.Box3().setFromObject(group);
    const halfDepth = (box.max.z - box.min.z) / 2;

    // Position object so its back face touches the wall
    group.position.x = b.px + nx * halfDepth;
    group.position.z = b.pz + nz * halfDepth;

    // Orient object to face inward (back to wall)
    group.rotation.y = b.angle + Math.PI;
  }

  /** Room height derived from wall meshes — defaults to 2.8m */
  private roomHeightM(): number {
    let h = 2.8;
    this.wallMeshMap.forEach((mesh, id) => {
      if (!id.startsWith('__floor__')) h = Math.max(h, mesh.scale.y);
    });
    return h;
  }

  private buildFurnitureMesh(objectId: string, assetId: string): THREE.Group {
    const g = new THREE.Group();
    g.userData['objectId'] = objectId;

    const mat = (hex: number, rough = 0.7, metal = 0) =>
      new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal });

    const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    };
    const cyl = (r: number, h: number, m: THREE.Material, x = 0, y = 0, z = 0, segs = 12) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segs), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    };

    // Resolve mesh type: prefer metadata.type string, fall back to legacy ID matching
    const meta = this.metadataEngine.getMetadata(assetId);
    const mtype = (meta?.['type'] as string | undefined) ?? '';

    const isSofa      = mtype === 'sofa'         || assetId === 's1' || assetId === 's3';
    const isLoveseat  = mtype === 'loveseat';
    const isChair     = mtype === 'chair'         || assetId === 's2';
    const isOttoman   = mtype === 'ottoman'       || assetId === 's4';
    const isCoffee    = mtype === 'coffee_table'  || assetId === 't1';
    const isDining    = mtype === 'dining_table'  || assetId === 't2';
    const isSide      = mtype === 'side_table'    || assetId === 't3';
    const isBed       = mtype === 'bed'           || assetId === 'b1' || assetId === 'b2';
    const isWardrobe  = mtype === 'wardrobe'      || assetId === 'st1';
    const isBookshelf = mtype === 'bookshelf'     || assetId === 'st2';
    const isFloorLamp = mtype === 'floor_lamp'    || assetId === 'l1';
    const isPendant   = mtype === 'pendant_light' || assetId === 'l2';

    // ── Sofa / Loveseat ───────────────────────────────────────────────────────
    if (isSofa || isLoveseat) {
      const dims = meta?.['dimensions'] as { width?: number } | undefined;
      const W = dims?.width ?? (isLoveseat ? 1.4 : (assetId === 's3' ? 1.4 : 2.0));
      const fabric = mat(0x8B6F4E, 0.9);
      const legM   = mat(0x3B2A1A, 0.8);
      g.add(
        box(W, 0.22, 0.7, fabric, 0, 0.22, 0),          // seat cushion
        box(W, 0.55, 0.18, fabric, 0, 0.55, -0.26),     // back rest
        box(0.18, 0.45, 0.7, fabric, -(W/2-0.09), 0.4, 0), // left arm
        box(0.18, 0.45, 0.7, fabric,  (W/2-0.09), 0.4, 0), // right arm
        cyl(0.04, 0.12, legM, -(W/2-0.1), 0.06,  0.25),
        cyl(0.04, 0.12, legM,  (W/2-0.1), 0.06,  0.25),
        cyl(0.04, 0.12, legM, -(W/2-0.1), 0.06, -0.25),
        cyl(0.04, 0.12, legM,  (W/2-0.1), 0.06, -0.25),
      );
    }

    // ── Accent Chair ─────────────────────────────────────────────────────────
    else if (isChair) {
      const fab = mat(0x6B4C2A, 0.85);
      const leg = mat(0x2A1A0A, 0.8);
      g.add(
        box(0.7, 0.18, 0.65, fab, 0, 0.26, 0),
        box(0.7, 0.5,  0.16, fab, 0, 0.52, -0.25),
        box(0.16, 0.38, 0.65, fab, -0.27, 0.38, 0),
        box(0.16, 0.38, 0.65, fab,  0.27, 0.38, 0),
        cyl(0.03, 0.14, leg, -0.28, 0.07,  0.26),
        cyl(0.03, 0.14, leg,  0.28, 0.07,  0.26),
        cyl(0.03, 0.14, leg, -0.28, 0.07, -0.26),
        cyl(0.03, 0.14, leg,  0.28, 0.07, -0.26),
      );
    }

    // ── Ottoman ──────────────────────────────────────────────────────────────
    else if (isOttoman) {
      const fab = mat(0x7A5C3A, 0.9);
      const leg = mat(0x3B2010, 0.8);
      g.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 24), fab),
        cyl(0.03, 0.12, leg, -0.25, -0.06,  0.25),
        cyl(0.03, 0.12, leg,  0.25, -0.06,  0.25),
        cyl(0.03, 0.12, leg, -0.25, -0.06, -0.25),
        cyl(0.03, 0.12, leg,  0.25, -0.06, -0.25),
      );
      g.children[0].position.y = 0.21;
      (g.children[0] as THREE.Mesh).castShadow = true;
      (g.children[0] as THREE.Mesh).receiveShadow = true;
    }

    // ── Coffee Table ─────────────────────────────────────────────────────────
    else if (isCoffee) {
      const top = mat(0x5C3D1E, 0.6); const leg = mat(0x3B2010, 0.8);
      g.add(
        box(1.1, 0.05, 0.55, top, 0, 0.44, 0),
        cyl(0.03, 0.4, leg, -0.48, 0.2,  0.23),
        cyl(0.03, 0.4, leg,  0.48, 0.2,  0.23),
        cyl(0.03, 0.4, leg, -0.48, 0.2, -0.23),
        cyl(0.03, 0.4, leg,  0.48, 0.2, -0.23),
      );
    }

    // ── Dining Table ─────────────────────────────────────────────────────────
    else if (isDining) {
      const top = mat(0x6B4A2A, 0.55); const leg = mat(0x3D2510, 0.75);
      g.add(
        box(1.8, 0.06, 0.9, top, 0, 0.74, 0),
        cyl(0.04, 0.7, leg, -0.82, 0.35,  0.38),
        cyl(0.04, 0.7, leg,  0.82, 0.35,  0.38),
        cyl(0.04, 0.7, leg, -0.82, 0.35, -0.38),
        cyl(0.04, 0.7, leg,  0.82, 0.35, -0.38),
      );
    }

    // ── Side Table ───────────────────────────────────────────────────────────
    else if (isSide) {
      const top = mat(0x7A5A35, 0.6); const leg = mat(0x3B2510, 0.8);
      g.add(
        box(0.5, 0.04, 0.5, top, 0, 0.56, 0),
        cyl(0.025, 0.54, leg, -0.21, 0.27,  0.21),
        cyl(0.025, 0.54, leg,  0.21, 0.27,  0.21),
        cyl(0.025, 0.54, leg, -0.21, 0.27, -0.21),
        cyl(0.025, 0.54, leg,  0.21, 0.27, -0.21),
      );
    }

    // ── Bed ───────────────────────────────────────────────────────────────────
    else if (isBed) {
      const dims2 = meta?.['dimensions'] as { width?: number } | undefined;
      const W = dims2?.width ?? ((meta?.['size'] as string | undefined) === 'King' ? 1.8 : 1.5);
      const frame = mat(0x4A3520, 0.8); const mattress = mat(0xE8DDD0, 0.95);
      const pillow = mat(0xFAF7F2, 0.95); const blanket = mat(0x6B7FAA, 0.85);
      g.add(
        box(W + 0.1, 0.2, 2.05, frame, 0, 0.1, 0),          // bed frame
        box(W, 0.22, 1.8, mattress, 0, 0.31, 0.1),           // mattress
        box(W, 0.5, 0.08, frame, 0, 0.5, -0.98),             // headboard
        box(W - 0.1, 0.04, 0.72, blanket, 0, 0.44, 0.5),    // blanket
        box(0.4, 0.08, 0.28, pillow, -(W/2-0.23), 0.43, -0.55), // pillow L
        box(0.4, 0.08, 0.28, pillow,  (W/2-0.23), 0.43, -0.55), // pillow R
      );
    }

    // ── Wardrobe ─────────────────────────────────────────────────────────────
    else if (isWardrobe) {
      const wood = mat(0x6B4E2A, 0.7); const panel = mat(0x7A5A35, 0.65);
      const handle = mat(0xBB9960, 0.3, 0.6);
      g.add(
        box(1.8, 2.2, 0.6, wood, 0, 1.1, 0),                // carcass
        box(0.84, 2.1, 0.02, panel, -0.46, 1.1, 0.31),      // left door
        box(0.84, 2.1, 0.02, panel,  0.46, 1.1, 0.31),      // right door
        cyl(0.015, 0.12, handle, -0.06, 1.1, 0.33, 8),      // handle L
        cyl(0.015, 0.12, handle,  0.98, 1.1, 0.33, 8),      // handle R
      );
    }

    // ── Bookshelf ────────────────────────────────────────────────────────────
    else if (isBookshelf) {
      const wood = mat(0x7A5A35, 0.7); const book1 = mat(0xB34040, 0.9);
      const book2 = mat(0x3A6B8A, 0.9); const book3 = mat(0x4A8A4A, 0.9);
      g.add(
        box(1.0, 0.02, 0.28, wood, 0, 1.8, 0),  // top
        box(1.0, 0.02, 0.28, wood, 0, 1.2, 0),  // shelf 3
        box(1.0, 0.02, 0.28, wood, 0, 0.6, 0),  // shelf 2
        box(1.0, 0.02, 0.28, wood, 0, 0.0, 0),  // bottom
        box(0.02, 1.82, 0.28, wood, -0.5, 0.9, 0),  // left side
        box(0.02, 1.82, 0.28, wood,  0.5, 0.9, 0),  // right side
        box(0.06, 0.5, 0.24, book1, -0.35, 0.91, 0),
        box(0.06, 0.45, 0.24, book2, -0.25, 0.89, 0),
        box(0.06, 0.52, 0.24, book3, -0.15, 0.92, 0),
        box(0.06, 0.5, 0.24, book1,  0.25, 1.51, 0),
        box(0.06, 0.44, 0.24, book2,  0.35, 1.49, 0),
      );
    }

    // ── Floor Lamp ───────────────────────────────────────────────────────────
    else if (isFloorLamp) {
      const metal = mat(0x888880, 0.3, 0.8); const shade = mat(0xF0E6C8, 0.7);
      const base  = mat(0x555550, 0.4, 0.6);
      g.add(
        new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), base), // base disc
        cyl(0.015, 1.55, metal, 0, 0.8, 0),                  // pole
        new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.3, 24), shade),           // shade
      );
      g.children[0].position.y = 0.02;
      (g.children[0] as THREE.Mesh).castShadow = true;
      g.children[2].position.y = 1.65;
      (g.children[2] as THREE.Mesh).castShadow = true;
      (g.children[2] as THREE.Mesh).receiveShadow = true;
    }

    // ── Pendant Light ────────────────────────────────────────────────────────
    else if (isPendant) {
      const metal = mat(0x888880, 0.2, 0.9); const shade = mat(0xF5EDD5, 0.6);
      g.add(
        cyl(0.006, 1.6, metal, 0, 1.7, 0, 6),               // wire
        new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), shade),          // globe shade
      );
      g.children[1].position.y = 0.82;
      (g.children[1] as THREE.Mesh).castShadow = true;
    }

    // ── Generic fallback ─────────────────────────────────────────────────────
    else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        mat(0x888899, 0.6),
      );
      body.castShadow = true; body.receiveShadow = true;
      body.position.y = 0.35;
      g.add(body);
    }

    return g;
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
      if (id.startsWith('__floor__')) return;
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
      if (!id.startsWith('__floor__')) wallMeshes.push(mesh);
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

    // Infinite ground plane — sits below room floors to avoid z-fighting
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshStandardMaterial({ color: '#8A9E7A', roughness: 1.0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05; // below room floor meshes (Y=0) to prevent z-fighting
    ground.receiveShadow = true;
    this.threeScene.add(ground);
    this.threeScene.fog = new THREE.Fog(0xD4E9F7, 30, 150);

    // Infinite-looking grid — sits just above ground plane
    this.gridHelper = new THREE.GridHelper(500, 500, 0x888888, 0xCCCCCC);
    this.gridHelper.position.set(0, -0.04, 0);
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
