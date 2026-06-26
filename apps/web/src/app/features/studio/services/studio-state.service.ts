import { Injectable, signal } from '@angular/core';

export type StudioMode = 'select' | 'move' | 'rotate' | 'scale';
export type ViewMode = '2d' | '3d';
export type DrawTool =
  // Selection
  | 'select' | 'box-select' | 'lasso'
  // Navigation
  | 'pan'
  // Drawing — walls / rooms
  | 'wall' | 'curve' | 'room-rect'
  // Drawing — shapes
  | 'line' | 'rect' | 'circle' | 'polygon' | 'polyline' | 'freehand'
  // Elements
  | 'door' | 'window' | 'stair'
  // Annotation
  | 'text' | 'label' | 'note' | 'arrow' | 'symbol'
  // Measurement
  | 'measure' | 'measure-area' | 'measure-angle'
  // Editing helpers
  | 'move' | 'rotate-2d' | 'scale-2d' | 'mirror' | 'split-wall' | 'offset-wall';

export type SelectionState = 'none' | 'furniture' | 'wall' | 'room';
export type CameraPreset = 'perspective' | 'top' | 'front' | 'side' | 'eye-level' | 'birds-eye' | 'corner' | 'walkthrough';
export type TimeOfDay = 'dawn' | 'noon' | 'dusk' | 'night';
export type FloorMaterial = 'wood' | 'tile' | 'marble' | 'concrete';
export type Theme = 'dark' | 'light';

@Injectable()
export class StudioStateService {
  readonly theme = signal<Theme>('dark');
  readonly viewMode = signal<ViewMode>('3d');
  readonly mode = signal<StudioMode>('select');
  readonly isSaving = signal(false);
  readonly savedToast = signal(false);

  readonly leftPanelVisible = signal(true);
  readonly rightPanelVisible = signal(true);
  readonly topPanelVisible = signal(true);

  readonly selectionState = signal<SelectionState>('none');
  readonly selectedObjectId = signal<string | null>(null);
  readonly selectedObjectName = signal<string | null>(null);

  readonly drawTool = signal<DrawTool>('wall');
  readonly snapGrid = signal(true);
  readonly snapWall = signal(true);
  readonly snapAngle = signal(false);
  readonly snapCenter = signal(false);
  readonly snapEdge = signal(false);
  readonly snapMidpoint = signal(true);
  readonly snapVertex = signal(true);
  readonly zoom2d = signal(100);
  readonly gridSize = signal(30);

  readonly cameraPreset = signal<CameraPreset>('perspective');
  readonly fov = signal(60);

  readonly timeOfDay = signal<TimeOfDay>('noon');
  readonly lightTemperature = signal(4500);
  readonly lightIntensity = signal(70);
  readonly shadowStrength = signal(50);
  readonly bloomEnabled = signal(false);
  readonly dofEnabled = signal(false);
  readonly wireframeEnabled = signal(false);

  readonly wallColor = signal('#F5F0E8');
  readonly floorMaterial = signal<FloorMaterial>('wood');
  readonly roughness = signal(40);
  readonly reflectivity = signal(20);

  readonly showGrid = signal(true);
  readonly showDimensions = signal(true);
  readonly showAnnotations = signal(true);
  readonly showRooms = signal(true);
  readonly showStairs = signal(true);
  readonly showLayers = signal(false);
  readonly showFloors = signal(true);

  readonly cursorX = signal(0);
  readonly cursorY = signal(0);

  readonly itemCount = signal(0);
  readonly totalPrice = signal(0);
  readonly roomSize = signal({ width: 5.2, depth: 4.1, height: 2.8 });

  // Clipboard for copy/paste
  readonly clipboardIds = signal<string[]>([]);

  toggleTheme() { this.theme.update(t => t === 'dark' ? 'light' : 'dark'); }
  setViewMode(m: ViewMode) { this.viewMode.set(m); }
  setMode(m: StudioMode) { this.mode.set(m); }
  setDrawTool(t: DrawTool) { this.drawTool.set(t); }
  setCameraPreset(p: CameraPreset) { this.cameraPreset.set(p); }
  setTimeOfDay(t: TimeOfDay) { this.timeOfDay.set(t); }
  setFloorMaterial(m: FloorMaterial) { this.floorMaterial.set(m); }
  setSelectionState(s: SelectionState) { this.selectionState.set(s); }

  toggleSnap(key: 'grid' | 'wall' | 'angle' | 'center' | 'edge' | 'midpoint' | 'vertex') {
    const map: Record<string, ReturnType<typeof signal<boolean>>> = {
      grid: this.snapGrid, wall: this.snapWall, angle: this.snapAngle,
      center: this.snapCenter, edge: this.snapEdge, midpoint: this.snapMidpoint,
      vertex: this.snapVertex,
    };
    map[key]?.update(v => !v);
  }

  togglePanel(panel: 'left' | 'right' | 'top') {
    const map = { left: this.leftPanelVisible, right: this.rightPanelVisible, top: this.topPanelVisible };
    map[panel].update(v => !v);
  }
}
