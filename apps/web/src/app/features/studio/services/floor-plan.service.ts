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

@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  readonly walls    = signal<FPWall[]>([]);
  readonly doors    = signal<FPDoor[]>([]);
  readonly windows  = signal<FPWindow[]>([]);
  readonly measures = signal<FPMeasure[]>([]);

  private hist: Snapshot[] = [];
  private idx = -1;

  readonly canUndo = computed(() => { void this.walls(); return this.idx > 0; });
  readonly canRedo = computed(() => { void this.walls(); return this.idx < this.hist.length - 1; });

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

  clear(): void {
    this.walls.set([]); this.doors.set([]); this.windows.set([]); this.measures.set([]);
    this.hist = []; this.idx = -1;
  }

  private _capture(): Snapshot {
    const clone = <T>(arr: T[]): T[] => arr.map(o => JSON.parse(JSON.stringify(o)));
    return { walls: clone(this.walls()), doors: clone(this.doors()), windows: clone(this.windows()), measures: clone(this.measures()) };
  }

  private _restore(s: Snapshot): void {
    this.walls.set(JSON.parse(JSON.stringify(s.walls)));
    this.doors.set(JSON.parse(JSON.stringify(s.doors)));
    this.windows.set(JSON.parse(JSON.stringify(s.windows)));
    this.measures.set(JSON.parse(JSON.stringify(s.measures)));
  }
}
