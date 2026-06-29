export interface Pt { x: number; y: number }
export interface WallMeta { thickness: number; height: number; material: string; color: string }
export interface DoorMeta { width: number; height: number; swingDir: 'left' | 'right'; openAngle: number }
export interface WinMeta  { width: number; height: number; sillH: number }
export interface MeasureMeta { unit: 'm' | 'cm' }

export interface FPWall    { id: string; start: Pt; end: Pt; meta: WallMeta }
export interface FPDoor    { id: string; pos: Pt; angle: number; wallId: string | null; meta: DoorMeta }
export interface FPWindow  { id: string; pos: Pt; angle: number; wallId: string | null; meta: WinMeta }
export interface FPMeasure { id: string; start: Pt; end: Pt; meta: MeasureMeta }
