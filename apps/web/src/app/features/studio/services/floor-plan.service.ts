import { Injectable, signal, computed } from '@angular/core';
import { detectRooms, type DetectedRoom } from '../utils/room-detector';

export interface Pt { x: number; y: number }
export interface WallMeta { thickness: number; height: number; material: string; color: string }
export interface DoorMeta { width: number; height: number; swingDir: 'left' | 'right'; openAngle: number }
export interface WinMeta  { width: number; height: number; sillH: number }
export interface MeasureMeta { unit: 'm' | 'cm' }

export interface FPWall    { id: string; start: Pt; end: Pt; meta: WallMeta }
export interface FPDoor    { id: string; pos: Pt; angle: number; wallId: string | null; meta: DoorMeta }
export interface FPWindow  { id: string; pos: Pt; angle: number; wallId: string | null; meta: WinMeta }
export interface FPMeasure { id: string; start: Pt; end: Pt; meta: MeasureMeta }
export interface FPArc { id: string; start: Pt; ctrl: Pt; end: Pt; meta: WallMeta }

export type DrawElementType = 'wall' | 'door' | 'window' | 'measure' | 'arc' | 'stair' | 'text' | 'shape';

export interface StairMeta {
  width: number;
  steps: number;
  rise: number;
  run: number;
  direction: 'cw' | 'ccw';
  startFloorId: string;
  endFloorId: string;
  material: string;
  hasRailing: boolean;
  hasHandrail: boolean;
}

export interface FPStair {
  id: string;
  start: Pt;
  end: Pt;
  meta: StairMeta;
  layerId?: string;
}

export interface FPText {
  id: string;
  pos: Pt;
  text: string;
  fontSize: number;
  angle: number;
  color: string;
  bold: boolean;
  layerId?: string;
}

export type ShapeType = 'line' | 'rect' | 'circle' | 'polygon' | 'polyline';

export interface FPShape {
  id: string;
  type: ShapeType;
  points: Pt[];
  closed: boolean;
  stroke: string;
  fill: string;
  strokeWidth: number;
  layerId?: string;
}

export interface FloorLevel {
  id: string;
  name: string;
  elevation: number;
  height: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  opacity: number;
}

export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'hall' | 'dining' | 'balcony' | 'custom';

export interface FPRoom extends DetectedRoom {
  label: string;
  type: RoomType;
  floorColor: string;
}

const ROOM_TYPE_DEFAULTS: Record<RoomType, { label: string; color: string }> = {
  living:   { label: 'Living Room', color: '#FEF3C7' },
  bedroom:  { label: 'Bedroom',     color: '#EDE9FE' },
  kitchen:  { label: 'Kitchen',     color: '#DCFCE7' },
  bathroom: { label: 'Bathroom',    color: '#DBEAFE' },
  hall:     { label: 'Hall',        color: '#F3F4F6' },
  dining:   { label: 'Dining',      color: '#FEE2E2' },
  balcony:  { label: 'Balcony',     color: '#ECFDF5' },
  custom:   { label: 'Room',        color: '#F9FAFB' },
};

export const ROOM_COLORS: string[] = [
  '#FEF3C7', '#EDE9FE', '#DCFCE7', '#DBEAFE',
  '#FEE2E2', '#ECFDF5', '#FFF7ED', '#F0FDF4',
];

export { DetectedRoom };

export const DEFAULT_STAIR_META: StairMeta = {
  width: 1200, steps: 12, rise: 170, run: 280,
  direction: 'cw', startFloorId: 'ground', endFloorId: 'first',
  material: 'concrete', hasRailing: true, hasHandrail: true,
};

export const DEFAULT_FLOORS: FloorLevel[] = [
  { id: 'ground', name: 'Ground Floor', elevation: 0, height: 2800, visible: true, locked: false, opacity: 1, order: 0 },
];

export const DEFAULT_LAYERS: Layer[] = [
  { id: 'walls',       name: 'Walls',       visible: true, locked: false, color: '#6B7280', opacity: 1 },
  { id: 'doors',       name: 'Doors',       visible: true, locked: false, color: '#F59E0B', opacity: 1 },
  { id: 'windows',     name: 'Windows',     visible: true, locked: false, color: '#3B82F6', opacity: 1 },
  { id: 'furniture',   name: 'Furniture',   visible: true, locked: false, color: '#8B5CF6', opacity: 1 },
  { id: 'stairs',      name: 'Stairs',      visible: true, locked: false, color: '#10B981', opacity: 1 },
  { id: 'dimensions',  name: 'Dimensions',  visible: true, locked: false, color: '#EF4444', opacity: 1 },
  { id: 'annotations', name: 'Annotations', visible: true, locked: false, color: '#06B6D4', opacity: 1 },
  { id: 'electrical',  name: 'Electrical',  visible: true, locked: false, color: '#F59E0B', opacity: 1 },
  { id: 'plumbing',    name: 'Plumbing',    visible: true, locked: false, color: '#06B6D4', opacity: 1 },
];

interface RoomOverride { label: string; type: RoomType; floorColor: string }

interface Snapshot {
  walls: FPWall[]; doors: FPDoor[]; windows: FPWindow[]; measures: FPMeasure[]; arcs: FPArc[];
  stairs: FPStair[]; texts: FPText[]; shapes: FPShape[];
  roomOverrides: Record<string, RoomOverride>;
}

export const DEFAULT_WALL_META: WallMeta = { thickness: 200, height: 2800, material: 'concrete', color: '#D4C8B8' };
export const DEFAULT_DOOR_META: DoorMeta = { width: 900, height: 2100, swingDir: 'left', openAngle: 90 };
export const DEFAULT_WIN_META:  WinMeta  = { width: 1200, height: 1100, sillH: 900 };

const MAX_HIST = 50;
const PPM = 100; // pixels per meter in 2D canvas

function fuid(): string { return Math.random().toString(36).slice(2, 9); }

@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  readonly walls    = signal<FPWall[]>([]);
  readonly doors    = signal<FPDoor[]>([]);
  readonly windows  = signal<FPWindow[]>([]);
  readonly measures = signal<FPMeasure[]>([]);
  readonly arcs     = signal<FPArc[]>([]);

  readonly stairs   = signal<FPStair[]>([]);
  readonly texts    = signal<FPText[]>([]);
  readonly shapes   = signal<FPShape[]>([]);

  readonly floors   = signal<FloorLevel[]>(DEFAULT_FLOORS);
  readonly activeFloorId = signal<string>('ground');
  readonly activeFloor = computed(() => this.floors().find(f => f.id === this.activeFloorId()) ?? this.floors()[0]);

  readonly layers   = signal<Layer[]>(DEFAULT_LAYERS);

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly selectionBox = signal<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  /** Per-room user overrides: label, type, color — keyed by room index (stable within a session) */
  readonly roomOverrides = signal<Record<string, RoomOverride>>({});

  // Selection (shared between 2D canvas and properties panel)
  readonly selectedId   = signal<string | null>(null);
  readonly selectedType = signal<'wall' | 'door' | 'window' | 'measure' | 'arc' | null>(null);

  /** Selected room index (-1 = none) — drives Room tab in properties panel */
  readonly selectedRoomIndex = signal<number>(-1);
  readonly selectedRoom = computed(() => {
    const i = this.selectedRoomIndex();
    if (i < 0) return null;
    return this.rooms()[i] ?? null;
  });

  readonly selectedWall    = computed(() => this.walls().find(w => w.id === this.selectedId()) ?? null);
  readonly selectedDoor    = computed(() => this.doors().find(d => d.id === this.selectedId()) ?? null);
  readonly selectedWindow  = computed(() => this.windows().find(w => w.id === this.selectedId()) ?? null);
  readonly selectedMeasure = computed(() => this.measures().find(m => m.id === this.selectedId()) ?? null);

  /** Detected rooms — recomputed whenever walls change */
  readonly rooms = computed((): FPRoom[] => {
    const detected = detectRooms(this.walls());
    const overrides = this.roomOverrides();
    return detected.map((r, i) => {
      const key = `r${i}`;
      const ov = overrides[key];
      const defaultColor = ROOM_COLORS[i % ROOM_COLORS.length];
      return {
        ...r,
        label:      ov?.label      ?? autoRoomLabel(i),
        type:       ov?.type       ?? autoRoomType(i),
        floorColor: ov?.floorColor ?? defaultColor,
      };
    });
  });

  private hist: Snapshot[] = [];
  private idx = -1;

  readonly canUndo = computed(() => { void this.walls(); void this.stairs(); return this.idx > 0; });
  readonly canRedo = computed(() => { void this.walls(); void this.stairs(); return this.idx < this.hist.length - 1; });

  constructor() {
    this.initDefaultRoom();
  }

  /** 5 m × 4 m default room */
  initDefaultRoom(): void {
    const m = { ...DEFAULT_WALL_META };
    const walls: FPWall[] = [
      { id: fuid(), start: { x: 100, y: 100 }, end: { x: 600, y: 100 }, meta: { ...m } },
      { id: fuid(), start: { x: 600, y: 100 }, end: { x: 600, y: 500 }, meta: { ...m } },
      { id: fuid(), start: { x: 600, y: 500 }, end: { x: 100, y: 500 }, meta: { ...m } },
      { id: fuid(), start: { x: 100, y: 500 }, end: { x: 100, y: 100 }, meta: { ...m } },
    ];
    this.walls.set(walls);
    this.doors.set([]);
    this.windows.set([]);
    this.measures.set([]);
    this.arcs.set([]);
    this.stairs.set([]);
    this.texts.set([]);
    this.shapes.set([]);
    this.roomOverrides.set({});
    this.hist = [this._capture()];
    this.idx = 0;
  }

  /** Update a room's label/type/color by its detected index */
  setRoomOverride(index: number, ov: Partial<RoomOverride>): void {
    const key = `r${index}`;
    this.roomOverrides.update(o => ({
      ...o,
      [key]: { ...(o[key] ?? { label: autoRoomLabel(index), type: autoRoomType(index), floorColor: ROOM_COLORS[index % ROOM_COLORS.length] }), ...ov },
    }));
  }

  /** Call BEFORE mutating — saves current state as a restore point */
  snapshot(): void {
    const s = this._capture();
    this.hist = this.hist.slice(0, this.idx + 1);
    this.hist.push(s);
    if (this.hist.length > MAX_HIST) { this.hist.shift(); } else { this.idx++; }
  }

  undo(): void {
    if (this.idx <= 0) return;
    this.idx--;
    this._restore(this.hist[this.idx]);
  }

  redo(): void {
    if (this.idx >= this.hist.length - 1) return;
    this.idx++;
    this._restore(this.hist[this.idx]);
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.selectedType.set(null);
    this.selectedRoomIndex.set(-1);
    this.clearMultiSelection();
  }

  clear(): void {
    this.walls.set([]); this.doors.set([]); this.windows.set([]); this.measures.set([]); this.arcs.set([]);
    this.stairs.set([]); this.texts.set([]); this.shapes.set([]);
    this.roomOverrides.set({});
    this.clearSelection();
    this.hist = []; this.idx = -1;
  }

  /** Derived: wall length in meters */
  wallLengthM(w: FPWall): number {
    const dx = w.end.x - w.start.x; const dy = w.end.y - w.start.y;
    return +(Math.sqrt(dx * dx + dy * dy) / PPM).toFixed(3);
  }

  addFloor(name: string): void {
    const id = fuid();
    const existing = this.floors();
    const maxOrder = existing.reduce((m, f) => Math.max(m, f.order), 0);
    this.floors.update(fs => [...fs, {
      id, name, elevation: (maxOrder + 1) * 3000, height: 2800,
      visible: true, locked: false, opacity: 1, order: maxOrder + 1,
    }]);
    this.activeFloorId.set(id);
  }

  removeFloor(id: string): void {
    if (this.floors().length <= 1) return;
    this.floors.update(fs => fs.filter(f => f.id !== id));
    if (this.activeFloorId() === id) this.activeFloorId.set(this.floors()[0].id);
  }

  setActiveFloor(id: string): void { this.activeFloorId.set(id); }

  toggleLayer(id: string): void {
    this.layers.update(ls => ls.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }

  lockLayer(id: string): void {
    this.layers.update(ls => ls.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  }

  isLayerVisible(id: string): boolean {
    return this.layers().find(l => l.id === id)?.visible ?? true;
  }

  isLayerLocked(id: string): boolean {
    return this.layers().find(l => l.id === id)?.locked ?? false;
  }

  toggleMultiSelect(id: string): void {
    this.selectedIds.update(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  clearMultiSelection(): void { this.selectedIds.set(new Set()); }

  selectAll(): void {
    const ids = new Set<string>([
      ...this.walls().map(w => w.id),
      ...this.doors().map(d => d.id),
      ...this.windows().map(w => w.id),
      ...this.measures().map(m => m.id),
      ...this.arcs().map(a => a.id),
      ...this.stairs().map(s => s.id),
    ]);
    this.selectedIds.set(ids);
  }

  deleteSelectedIds(): void {
    const ids = this.selectedIds();
    if (!ids.size) return;
    this.snapshot();
    this.walls.update(ws => ws.filter(w => !ids.has(w.id)));
    this.doors.update(ds => ds.filter(d => !ids.has(d.id)));
    this.windows.update(ws => ws.filter(w => !ids.has(w.id)));
    this.measures.update(ms => ms.filter(m => !ids.has(m.id)));
    this.arcs.update(as => as.filter(a => !ids.has(a.id)));
    this.stairs.update(ss => ss.filter(s => !ids.has(s.id)));
    this.texts.update(ts => ts.filter(t => !ids.has(t.id)));
    this.shapes.update(sh => sh.filter(s => !ids.has(s.id)));
    this.selectedIds.set(new Set());
  }

  private _capture(): Snapshot {
    return JSON.parse(JSON.stringify({
      walls: this.walls(), doors: this.doors(), windows: this.windows(),
      measures: this.measures(), arcs: this.arcs(),
      stairs: this.stairs(), texts: this.texts(), shapes: this.shapes(),
      roomOverrides: this.roomOverrides(),
    }));
  }

  private _restore(s: Snapshot): void {
    const p = JSON.parse(JSON.stringify(s));
    this.walls.set(p.walls); this.doors.set(p.doors); this.windows.set(p.windows);
    this.measures.set(p.measures); this.arcs.set(p.arcs ?? []);
    this.stairs.set(p.stairs ?? []); this.texts.set(p.texts ?? []); this.shapes.set(p.shapes ?? []);
    this.roomOverrides.set(p.roomOverrides ?? {});
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTO_LABELS = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hall', 'Dining', 'Balcony'];
const AUTO_TYPES: RoomType[] = ['living', 'bedroom', 'kitchen', 'bathroom', 'hall', 'dining', 'balcony'];

function autoRoomLabel(i: number): string { return AUTO_LABELS[i] ?? `Room ${i + 1}`; }
function autoRoomType(i: number): RoomType { return AUTO_TYPES[i] ?? 'custom'; }
