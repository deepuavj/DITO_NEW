import { Injectable, signal, computed } from '@angular/core';

export interface Pt { x: number; y: number }
export interface WallMeta { thickness: number; height: number; material: string; color: string }
export interface DoorMeta { width: number; height: number; swingDir: 'left' | 'right'; openAngle: number }
export interface WinMeta  { width: number; height: number; sillH: number }
export interface MeasureMeta { unit: 'm' | 'cm' }

export interface FPWall    { id: string; start: Pt; end: Pt; meta: WallMeta }
export interface FPDoor    { id: string; pos: Pt; angle: number; wallId: string | null; meta: DoorMeta }
export interface FPWindow  { id: string; pos: Pt; angle: number; wallId: string | null; meta: WinMeta }
export interface FPMeasure { id: string; start: Pt; end: Pt; meta: MeasureMeta }

interface Snapshot {
  walls: FPWall[]; doors: FPDoor[]; windows: FPWindow[]; measures: FPMeasure[];
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

  // Selection (shared between 2D canvas and properties panel)
  readonly selectedId   = signal<string | null>(null);
  readonly selectedType = signal<'wall' | 'door' | 'window' | 'measure' | null>(null);

  readonly selectedWall    = computed(() => this.walls().find(w => w.id === this.selectedId()) ?? null);
  readonly selectedDoor    = computed(() => this.doors().find(d => d.id === this.selectedId()) ?? null);
  readonly selectedWindow  = computed(() => this.windows().find(w => w.id === this.selectedId()) ?? null);
  readonly selectedMeasure = computed(() => this.measures().find(m => m.id === this.selectedId()) ?? null);

  private hist: Snapshot[] = [];
  private idx = -1;

  readonly canUndo = computed(() => { void this.walls(); return this.idx > 0; });
  readonly canRedo = computed(() => { void this.walls(); return this.idx < this.hist.length - 1; });

  constructor() {
    this.initDefaultRoom();
  }

  /** 5 m × 4 m default room */
  initDefaultRoom(): void {
    const m = { ...DEFAULT_WALL_META };
    // Room: (100,100) → (600,100) → (600,500) → (100,500) → back
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
    this.hist = [this._capture()];
    this.idx = 0;
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
  }

  clear(): void {
    this.walls.set([]); this.doors.set([]); this.windows.set([]); this.measures.set([]);
    this.clearSelection();
    this.hist = []; this.idx = -1;
  }

  /** Derived: wall length in meters */
  wallLengthM(w: FPWall): number {
    const dx = w.end.x - w.start.x; const dy = w.end.y - w.start.y;
    return +(Math.sqrt(dx * dx + dy * dy) / PPM).toFixed(3);
  }

  private _capture(): Snapshot {
    return JSON.parse(JSON.stringify({
      walls: this.walls(), doors: this.doors(), windows: this.windows(), measures: this.measures(),
    }));
  }

  private _restore(s: Snapshot): void {
    const p = JSON.parse(JSON.stringify(s));
    this.walls.set(p.walls); this.doors.set(p.doors); this.windows.set(p.windows); this.measures.set(p.measures);
  }
}

