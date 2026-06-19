import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import type { DrawTool, CameraPreset, TimeOfDay, FloorMaterial } from '../../services/studio-state.service';

@Component({
  selector: 'dito-studio-toolbar',
  imports: [CommonModule],
  styles: [`
    .toolbar-root { display: flex; flex-direction: column; padding: 10px 12px 8px; gap: 8px; background: transparent; flex-shrink: 0; }
    .mode-bar { display: flex; gap: 6px; justify-content: center; }
    .mode-btn { display: flex; align-items: center; gap: 8px; padding: 8px 20px; background: rgba(14,20,35,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #7C8CA0; font-size: 13px; cursor: pointer; transition: all 200ms; backdrop-filter: blur(20px); }
    .mode-btn:hover, .mode-btn.active { border-color: rgba(37,99,235,0.6); color: #E2E8F0; background: rgba(37,99,235,0.15); }
    .panels-row { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
    .panels-row::-webkit-scrollbar { display: none; }
    .panel-island { background: rgba(14,20,35,0.96); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 14px; min-width: 0; flex-shrink: 0; backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .panel-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #E2E8F0; margin-bottom: 12px; white-space: nowrap; }
    .badge { font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
    .badge.shared { background: rgba(212,160,23,0.2); color: #D4A017; border: 1px solid rgba(212,160,23,0.3); }
    .badge.two-d { background: rgba(37,99,235,0.2); color: #60A5FA; border: 1px solid rgba(37,99,235,0.3); }
    .badge.three-d { background: rgba(20,184,166,0.2); color: #2DD4BF; border: 1px solid rgba(20,184,166,0.3); }
    .action-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; }
    .action-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 10px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; min-width: 64px; }
    .action-btn:hover { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #E2E8F0; }
    .action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .action-btn.danger:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); color: #FCA5A5; }
    .view-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 10px; }
    .view-btn { padding: 8px 14px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 12px; cursor: pointer; transition: all 150ms; text-align: center; }
    .view-btn:hover, .view-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #E2E8F0; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; gap: 16px; }
    .toggle-label { font-size: 12px; color: #7C8CA0; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
    .toggle-switch { width: 36px; height: 20px; background: #2D3748; border: none; border-radius: 10px; position: relative; cursor: pointer; transition: background 200ms; flex-shrink: 0; }
    .toggle-switch.on { background: #2563EB; }
    .toggle-switch .thumb { position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: transform 200ms; }
    .toggle-switch.on .thumb { transform: translateX(16px); }
    .tool-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 4px; margin-bottom: 10px; }
    .tool-btn { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; }
    .tool-btn.active { background: rgba(37,99,235,0.25); border-color: rgba(37,99,235,0.5); color: #60A5FA; }
    .section-label { font-size: 10px; font-weight: 600; color: #4A5568; letter-spacing: 0.08em; margin: 10px 0 6px; }
    .snap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .snap-btn { padding: 7px 10px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .snap-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    .slider-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .slider-label { font-size: 11px; color: #7C8CA0; white-space: nowrap; min-width: 80px; }
    .slider { flex: 1; height: 4px; appearance: none; background: #1E2D45; border-radius: 2px; outline: none; }
    .slider::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; background: #D4A017; border-radius: 50%; cursor: pointer; }
    .slider-val { font-size: 11px; color: #D4A017; min-width: 44px; text-align: right; }
    .export-row { display: flex; gap: 4px; }
    .export-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 6px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 10px; cursor: pointer; transition: all 150ms; }
    .export-btn:hover { background: rgba(37,99,235,0.2); color: #E2E8F0; }
    .cam-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    .cam-tool { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; }
    .cam-tool.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3); color: #D4A017; }
    .cam-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .cam-preset-btn { padding: 8px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .cam-preset-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    .tod-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    .tod-btn { padding: 8px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .tod-btn.active { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3); color: #D4A017; }
    .color-swatches { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; margin-bottom: 8px; }
    .swatch { width: 32px; height: 32px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; transition: all 150ms; }
    .swatch.selected { border-color: #2563EB; transform: scale(1.1); }
    .floor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
    .floor-btn { padding: 8px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #9CA3B0; font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .floor-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
  `],
  template: `
    <div class="toolbar-root">
      <div class="mode-bar">
        <button class="mode-btn" [class.active]="state.viewMode()==='2d'" (click)="state.setViewMode('2d')">□ 2D floor plan</button>
        <button class="mode-btn" [class.active]="state.viewMode()==='3d'" (click)="state.setViewMode('3d')">□ 3D room view</button>
      </div>

      <div class="panels-row">
        <div class="panel-island">
          <div class="panel-header"><span class="badge shared">Shared</span> Actions</div>
          <div class="action-grid">
            <button class="action-btn" (click)="history.undo()" [disabled]="!history.canUndo()">↩ Undo</button>
            <button class="action-btn" (click)="history.redo()" [disabled]="!history.canRedo()">↪ Redo</button>
            <button class="action-btn">⎘ Duplicate</button>
            <button class="action-btn danger">⌫ Delete</button>
            <button class="action-btn" (click)="saveClicked.emit()">💾 Save</button>
            <button class="action-btn">↗ Share</button>
          </div>
        </div>

        <div class="panel-island">
          <div class="panel-header"><span class="badge shared">Shared</span> View</div>
          <div class="view-grid">
            @for (preset of viewPresets; track preset.id) {
              <button class="view-btn" [class.active]="state.cameraPreset()===preset.id" (click)="state.setCameraPreset(preset.id)">{{ preset.label }}</button>
            }
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Grid</span>
            <button class="toggle-switch" [class.on]="state.showGrid()" (click)="state.showGrid.update(v=>!v)"><span class="thumb"></span></button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Dimensions</span>
            <button class="toggle-switch" [class.on]="state.showDimensions()" (click)="state.showDimensions.update(v=>!v)"><span class="thumb"></span></button>
          </div>
        </div>

        @if (state.viewMode() === '2d') {
          <div class="panel-island">
            <div class="panel-header"><span class="badge two-d">2D only</span> Drawing tools</div>
            <div class="tool-grid">
              @for (tool of drawTools; track tool.id) {
                <button class="tool-btn" [class.active]="state.drawTool()===tool.id" (click)="state.setDrawTool(tool.id)">{{ tool.label }}</button>
              }
            </div>
            <div class="section-label">SNAPPING</div>
            <div class="snap-grid">
              @for (snap of snapModes; track snap.id) {
                <button class="snap-btn" [class.active]="getSnap(snap.id)()" (click)="state.toggleSnap(snap.id)">{{ snap.label }}</button>
              }
            </div>
          </div>

          <div class="panel-island">
            <div class="panel-header"><span class="badge two-d">2D only</span> Canvas</div>
            <div class="slider-row">
              <span class="slider-label">Zoom</span>
              <input type="range" min="25" max="400" [value]="state.zoom2d()" (input)="state.zoom2d.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.zoom2d() }}%</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Grid size</span>
              <input type="range" min="10" max="100" [value]="state.gridSize()" (input)="state.gridSize.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.gridSize() }}cm</span>
            </div>
            <div class="section-label">EXPORT</div>
            <div class="export-row">
              <button class="export-btn">PNG</button>
              <button class="export-btn">SVG</button>
              <button class="export-btn">DXF</button>
            </div>
          </div>
        }

        @if (state.viewMode() === '3d') {
          <div class="panel-island">
            <div class="panel-header"><span class="badge three-d">3D only</span> Camera &amp; navigation</div>
            <div class="cam-tools">
              <button class="cam-tool active">Orbit</button>
              <button class="cam-tool">Pan</button>
              <button class="cam-tool">Zoom</button>
              <button class="cam-tool">Focus</button>
            </div>
            <div class="slider-row">
              <span class="slider-label">Field of view</span>
              <input type="range" min="20" max="120" [value]="state.fov()" (input)="state.fov.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.fov() }}°</span>
            </div>
            <div class="section-label">CAMERA PRESET</div>
            <div class="cam-presets">
              @for (p of camPresets; track p.id) {
                <button class="cam-preset-btn" [class.active]="state.cameraPreset()===p.id" (click)="state.setCameraPreset(p.id)">{{ p.label }}</button>
              }
            </div>
          </div>

          <div class="panel-island">
            <div class="panel-header"><span class="badge three-d">3D only</span> Lighting &amp; render</div>
            <div class="section-label">TIME OF DAY</div>
            <div class="tod-grid">
              @for (tod of timesOfDay; track tod.id) {
                <button class="tod-btn" [class.active]="state.timeOfDay()===tod.id" (click)="state.setTimeOfDay(tod.id)">{{ tod.label }}</button>
              }
            </div>
            <div class="slider-row">
              <span class="slider-label">Temperature</span>
              <input type="range" min="2700" max="7000" [value]="state.lightTemperature()" (input)="state.lightTemperature.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.lightTemperature() }}K</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Intensity</span>
              <input type="range" min="0" max="100" [value]="state.lightIntensity()" (input)="state.lightIntensity.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.lightIntensity() }}%</span>
            </div>
            <div class="slider-row">
              <span class="slider-label">Shadows</span>
              <input type="range" min="0" max="100" [value]="state.shadowStrength()" (input)="state.shadowStrength.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.shadowStrength() }}%</span>
            </div>
            <div class="toggle-row"><span class="toggle-label">Bloom</span><button class="toggle-switch" [class.on]="state.bloomEnabled()" (click)="state.bloomEnabled.update(v=>!v)"><span class="thumb"></span></button></div>
            <div class="toggle-row"><span class="toggle-label">Depth of field</span><button class="toggle-switch" [class.on]="state.dofEnabled()" (click)="state.dofEnabled.update(v=>!v)"><span class="thumb"></span></button></div>
            <div class="toggle-row"><span class="toggle-label">Wireframe</span><button class="toggle-switch" [class.on]="state.wireframeEnabled()" (click)="state.wireframeEnabled.update(v=>!v)"><span class="thumb"></span></button></div>
          </div>

          <div class="panel-island">
            <div class="panel-header"><span class="badge three-d">3D only</span> Materials</div>
            <div class="section-label">WALL COLOUR</div>
            <div class="color-swatches">
              @for (c of wallColors; track c) {
                <button class="swatch" [style.background]="c" [class.selected]="state.wallColor()===c" (click)="state.wallColor.set(c)"></button>
              }
            </div>
            <div class="section-label">FLOOR MATERIAL</div>
            <div class="floor-grid">
              @for (f of floorMaterials; track f.id) {
                <button class="floor-btn" [class.active]="state.floorMaterial()===f.id" (click)="state.setFloorMaterial(f.id)">{{ f.label }}</button>
              }
            </div>
            <div class="slider-row">
              <span class="slider-label">Roughness</span>
              <input type="range" min="0" max="100" [value]="state.roughness()" (input)="state.roughness.set(+$any($event.target).value)" class="slider" />
              <span class="slider-val">{{ state.roughness() }}%</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class StudioToolbarComponent {
  readonly state = inject(StudioStateService);
  readonly history = inject(HistoryService);
  readonly saveClicked = output();
  readonly renderClicked = output();

  readonly viewPresets = [
    { id: 'perspective' as CameraPreset, label: 'Perspective' },
    { id: 'top' as CameraPreset, label: 'Top' },
    { id: 'front' as CameraPreset, label: 'Front' },
    { id: 'side' as CameraPreset, label: 'Side' },
  ];

  readonly drawTools: { id: DrawTool; label: string }[] = [
    { id: 'select', label: 'Select' },
    { id: 'pan', label: 'Pan' },
    { id: 'wall', label: 'Draw wall' },
    { id: 'measure', label: 'Measure' },
    { id: 'rotate', label: 'Rotate' },
  ];

  readonly snapModes: { id: 'grid' | 'wall' | 'angle' | 'center' | 'edge' | 'midpoint'; label: string }[] = [
    { id: 'grid', label: 'Grid snap' },
    { id: 'wall', label: 'Wall snap' },
    { id: 'angle', label: 'Angle snap' },
    { id: 'center', label: 'Center snap' },
    { id: 'edge', label: 'Edge snap' },
    { id: 'midpoint', label: 'Midpoint' },
  ];

  readonly camPresets = [
    { id: 'eye-level' as CameraPreset, label: 'Eye level' },
    { id: 'birds-eye' as CameraPreset, label: "Bird's eye" },
    { id: 'corner' as CameraPreset, label: 'Corner' },
    { id: 'walkthrough' as CameraPreset, label: 'Walk-thru' },
  ];

  readonly timesOfDay: { id: TimeOfDay; label: string }[] = [
    { id: 'dawn', label: 'Dawn' },
    { id: 'noon', label: 'Noon' },
    { id: 'dusk', label: 'Dusk' },
    { id: 'night', label: 'Night' },
  ];

  readonly wallColors = ['#F5F0E8', '#E8E0D0', '#D4C4A8', '#C8D0D8', '#B0B8C8', '#8C9BB0', '#4A5568', '#1A202C'];

  readonly floorMaterials: { id: FloorMaterial; label: string }[] = [
    { id: 'wood', label: 'Wood' },
    { id: 'tile', label: 'Tile' },
    { id: 'marble', label: 'Marble' },
    { id: 'concrete', label: 'Concrete' },
  ];

  getSnap(id: string) {
    const map: Record<string, any> = {
      grid: this.state.snapGrid, wall: this.state.snapWall, angle: this.state.snapAngle,
      center: this.state.snapCenter, edge: this.state.snapEdge, midpoint: this.state.snapMidpoint,
    };
    return map[id];
  }
}
