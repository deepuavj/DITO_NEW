import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import { FloorPlanService } from '../../services/floor-plan.service';
import { SceneEngine } from '../../../../engines/scene/scene.engine';
import { MetadataEngine } from '../../../../engines/metadata/metadata.engine';
import type { FloorMaterial } from '../../services/studio-state.service';
import type { PropertyDef } from '../../../../core/models/asset.models';
import type { RoomType } from '../../services/floor-plan.service';
import { ROOM_COLORS } from '../../services/floor-plan.service';

@Component({
  selector: 'dito-properties-panel',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; width: 240px; flex-shrink: 0; }
    .panel { display: flex; flex-direction: column; width: 240px; height: 100%; background: var(--panel-bg); border-left: 1px solid var(--border); overflow: hidden; }
    /* tabs */
    .tabs { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex-shrink: 0; padding: 9px 14px; font-size: 11px; font-weight: 600; color: var(--muted); border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; transition: all 150ms; }
    .tab.active { color: var(--fg); border-bottom-color: #2563EB; }
    .tab:hover { color: var(--fg); }
    /* content */
    .content { flex: 1; overflow-y: auto; padding: 12px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
    /* section */
    .section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); margin: 12px 0 6px; }
    .section-label:first-child { margin-top: 0; }
    /* empty state */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; color: var(--muted); font-size: 12px; text-align: center; padding: 24px; }
    .empty-icon { font-size: 36px; opacity: 0.4; }
    /* property rows */
    .prop-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; gap: 8px; }
    .prop-label { font-size: 12px; color: var(--muted); flex-shrink: 0; }
    .prop-val { font-size: 12px; font-weight: 600; color: var(--fg); }
    /* slider */
    .slider { flex: 1; height: 4px; appearance: none; background: rgba(255,255,255,0.08); border-radius: 2px; outline: none; }
    .slider::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; background: #D4A017; border-radius: 50%; cursor: pointer; }
    /* toggle */
    .toggle { width: 34px; height: 18px; background: rgba(255,255,255,0.1); border: none; border-radius: 9px; position: relative; cursor: pointer; transition: background 200ms; }
    .toggle.on { background: #2563EB; }
    .toggle .thumb { position: absolute; width: 12px; height: 12px; background: white; border-radius: 50%; top: 3px; left: 3px; transition: transform 200ms; }
    .toggle.on .thumb { transform: translateX(16px); }
    /* swatches */
    .swatches { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
    .swatch { width: 28px; height: 28px; border-radius: 6px; border: 2px solid transparent; cursor: pointer; transition: all 150ms; }
    .swatch.sel { border-color: #2563EB; transform: scale(1.1); }
    /* select */
    .sel-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .sel-btn { padding: 6px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .sel-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    /* transform inputs */
    .xyz-row { display: flex; gap: 4px; }
    .xyz-field { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .xyz-label { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); text-align: center; }
    .xyz-input { width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--fg); font-size: 11px; font-family: monospace; padding: 4px 6px; outline: none; text-align: center; box-sizing: border-box; }
    .xyz-input:focus { border-color: rgba(37,99,235,0.5); }
    /* history */
    .hist-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; margin-bottom: 2px; }
    .hist-item:hover { background: rgba(255,255,255,0.03); }
    .hist-dot { width: 6px; height: 6px; border-radius: 50%; background: #2563EB; flex-shrink: 0; }
    .hist-dot.undone { background: rgba(255,255,255,0.2); }
    .hist-label { font-size: 11px; color: var(--fg); flex: 1; }
    .hist-undone { opacity: 0.45; }
    /* room info */
    .stat-card { background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
    .stat-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
    .stat-key { font-size: 11px; color: var(--muted); }
    .stat-val { font-size: 12px; font-weight: 600; color: var(--fg); }
    /* floor */
    .floor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .floor-btn { padding: 7px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .floor-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    /* room type grid */
    .room-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .room-type-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 7px 2px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 10px; cursor: pointer; transition: all 150ms; }
    .room-type-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.5); color: #60A5FA; }
    .room-type-btn:hover { border-color: rgba(37,99,235,0.3); }
    /* room list */
    .room-list-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; cursor: pointer; transition: background 150ms; margin-bottom: 2px; border: 1px solid transparent; }
    .room-list-item:hover { background: rgba(255,255,255,0.04); }
    .room-list-item.active { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.3); }
    .room-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .room-list-label { flex: 1; font-size: 12px; color: var(--fg); }
    .room-list-area { font-size: 11px; color: var(--muted); }
  `],
  template: `
    <div class="panel">
      <div class="tabs">
        @for (tab of activeTabs(); track tab) {
          <button class="tab" [class.active]="activeTab()===tab" (click)="activeTab.set(tab)">{{ tab }}</button>
        }
      </div>
      <div class="content">

        @if (activeTab() === 'Overview') {
          @if (state.selectionState() === 'none') {
            <div class="empty">
              <div class="empty-icon">✦</div>
              <div>Select an object or click the canvas to begin</div>
            </div>
          }
        }

        @if (activeTab() === 'Properties') {
          @if (metaProps().length > 0) {
            <div class="section-label">ASSET PROPERTIES</div>
            @for (prop of metaProps(); track prop.id) {
              <div class="prop-row">
                <span class="prop-label">{{ prop.label }}</span>
                @switch (prop.type) {
                  @case ('slider') {
                    <input type="range" class="slider"
                      [min]="prop.min ?? 0" [max]="prop.max ?? 100" [step]="prop.step ?? 1" />
                  }
                  @case ('toggle') {
                    <button class="toggle"><span class="thumb"></span></button>
                  }
                  @case ('colorPicker') {
                    <div class="swatches">
                      @for (c of furnitureColors; track c) {
                        <button class="swatch" [style.background]="c"></button>
                      }
                    </div>
                  }
                  @case ('variantSelector') {
                    <div class="sel-grid">
                      @for (opt of prop.options ?? []; track opt.value) {
                        <button class="sel-btn">{{ opt.label }}</button>
                      }
                    </div>
                  }
                  @default {
                    <span class="prop-val">—</span>
                  }
                }
              </div>
            }
          } @else {
            <div class="section-label">APPEARANCE</div>
            <div class="prop-row">
              <span class="prop-label">Colour</span>
            </div>
            <div class="swatches" style="margin-bottom:12px">
              @for (c of furnitureColors; track c) {
                <button class="swatch" [style.background]="c"></button>
              }
            </div>
            <div class="section-label">MATERIAL</div>
            <div class="sel-grid">
              @for (m of materials; track m) {
                <button class="sel-btn">{{ m }}</button>
              }
            </div>
          }
        }

        @if (activeTab() === 'Transform') {
          @if (selectedObj(); as obj) {
            <div class="section-label">POSITION (m)</div>
            <div class="xyz-row" style="margin-bottom:10px">
              @for (axis of xyzAxes; track axis.i) {
                <div class="xyz-field">
                  <span class="xyz-label">{{ axis.label }}</span>
                  <input type="number" class="xyz-input"
                    [value]="obj.position[axis.i] | number:'1.2-2'"
                    (change)="setPosition(axis.i, +$any($event.target).value)"
                    step="0.1" />
                </div>
              }
            </div>
            <div class="section-label">ROTATION (°)</div>
            <div class="xyz-row" style="margin-bottom:10px">
              @for (axis of xyzAxes; track axis.i) {
                <div class="xyz-field">
                  <span class="xyz-label">{{ axis.label }}</span>
                  <input type="number" class="xyz-input"
                    [value]="obj.rotation[axis.i] | number:'1.0-0'"
                    (change)="setRotation(axis.i, +$any($event.target).value)"
                    step="15" />
                </div>
              }
            </div>
            <div class="section-label">SCALE</div>
            <div class="xyz-row" style="margin-bottom:14px">
              @for (axis of xyzAxes; track axis.i) {
                <div class="xyz-field">
                  <span class="xyz-label">{{ axis.label }}</span>
                  <input type="number" class="xyz-input"
                    [value]="obj.scale[axis.i] | number:'1.2-2'"
                    (change)="setScale(axis.i, +$any($event.target).value)"
                    step="0.1" min="0.01" />
                </div>
              }
            </div>
            <button class="sel-btn" style="width:100%;color:#EF4444;border-color:rgba(239,68,68,0.3)"
              (click)="deleteSelected()">Delete object</button>
          } @else {
            <div class="empty"><div>Select an object in the 3D view</div></div>
          }
        }

        @if (activeTab() === 'Wall') {
          @if (state.viewMode() === '2d' && floorPlan.selectedWall()) {
            <div class="section-label">WALL METADATA</div>
            <div class="stat-card">
              <div class="stat-row"><span class="stat-key">Length</span><span class="stat-val">{{ floorPlan.wallLengthM(floorPlan.selectedWall()!) }} m</span></div>
              <div class="stat-row"><span class="stat-key">Thickness</span><span class="stat-val">{{ floorPlan.selectedWall()!.meta.thickness }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Height</span><span class="stat-val">{{ floorPlan.selectedWall()!.meta.height }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Material</span><span class="stat-val">{{ floorPlan.selectedWall()!.meta.material }}</span></div>
            </div>
            <div class="section-label">DIMENSIONS</div>
            <div class="prop-row">
              <span class="prop-label">Thickness (mm)</span>
              <input type="number" class="xyz-input" style="width:70px"
                [value]="floorPlan.selectedWall()!.meta.thickness"
                (change)="setWallThickness(+$any($event.target).value)" min="50" max="500" step="10" />
            </div>
            <div class="prop-row">
              <span class="prop-label">Height (mm)</span>
              <input type="number" class="xyz-input" style="width:70px"
                [value]="floorPlan.selectedWall()!.meta.height"
                (change)="setWallHeight(+$any($event.target).value)" min="2000" max="6000" step="100" />
            </div>
            <div class="section-label">WALL COLOUR</div>
            <div class="swatches" style="margin-bottom:12px">
              @for (c of wallColors; track c) {
                <button class="swatch" [style.background]="c" [class.sel]="floorPlan.selectedWall()!.meta.color===c" (click)="setWallColor(c)"></button>
              }
            </div>
          } @else {
            <div class="section-label">WALL PROPERTIES</div>
            <div class="stat-card">
              <div class="stat-row"><span class="stat-key">Thickness</span><span class="stat-val">200 mm</span></div>
              <div class="stat-row"><span class="stat-key">Height</span><span class="stat-val">{{ state.roomSize().height }}m</span></div>
            </div>
            <div class="section-label">WALL COLOUR</div>
            <div class="swatches" style="margin-bottom:12px">
              @for (c of wallColors; track c) {
                <button class="swatch" [style.background]="c" [class.sel]="state.wallColor()===c" (click)="state.wallColor.set(c)"></button>
              }
            </div>
          }
        }

        @if (activeTab() === 'Door') {
          @if (floorPlan.selectedDoor()) {
            <div class="section-label">DOOR METADATA</div>
            <div class="stat-card">
              <div class="stat-row"><span class="stat-key">Width</span><span class="stat-val">{{ floorPlan.selectedDoor()!.meta.width }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Height</span><span class="stat-val">{{ floorPlan.selectedDoor()!.meta.height }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Swing</span><span class="stat-val">{{ floorPlan.selectedDoor()!.meta.swingDir }}</span></div>
              <div class="stat-row"><span class="stat-key">Open angle</span><span class="stat-val">{{ floorPlan.selectedDoor()!.meta.openAngle }}°</span></div>
              <div class="stat-row"><span class="stat-key">Angle</span><span class="stat-val">{{ (floorPlan.selectedDoor()!.angle * 180 / 3.14159) | number:'1.0-0' }}°</span></div>
            </div>
          }
        }

        @if (activeTab() === 'Window') {
          @if (floorPlan.selectedWindow()) {
            <div class="section-label">WINDOW METADATA</div>
            <div class="stat-card">
              <div class="stat-row"><span class="stat-key">Width</span><span class="stat-val">{{ floorPlan.selectedWindow()!.meta.width }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Height</span><span class="stat-val">{{ floorPlan.selectedWindow()!.meta.height }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Sill height</span><span class="stat-val">{{ floorPlan.selectedWindow()!.meta.sillH }} mm</span></div>
              <div class="stat-row"><span class="stat-key">Angle</span><span class="stat-val">{{ (floorPlan.selectedWindow()!.angle * 180 / 3.14159) | number:'1.0-0' }}°</span></div>
            </div>
          }
        }

        @if (activeTab() === 'Room') {
          @if (floorPlan.selectedRoom(); as room) {
            <!-- Selected room settings -->
            <div class="section-label">ROOM DETAILS</div>
            <div class="stat-card" style="margin-bottom:10px">
              <div class="stat-row"><span class="stat-key">Area</span><span class="stat-val">{{ room.area }} m²</span></div>
            </div>

            <div class="section-label">ROOM NAME</div>
            <input type="text" class="xyz-input" style="width:100%;margin-bottom:12px;box-sizing:border-box"
              [value]="room.label"
              (change)="setRoomLabel($any($event.target).value)"
              placeholder="e.g. Living Room" />

            <div class="section-label">ROOM TYPE</div>
            <div class="room-type-grid" style="margin-bottom:12px">
              @for (rt of roomTypes; track rt.value) {
                <button class="room-type-btn"
                  [class.active]="room.type === rt.value"
                  (click)="setRoomType(rt.value)">
                  <span style="font-size:16px">{{ rt.icon }}</span>
                  <span style="font-size:10px">{{ rt.label }}</span>
                </button>
              }
            </div>

            <div class="section-label">FLOOR COLOUR</div>
            <div class="swatches" style="margin-bottom:6px">
              @for (c of roomColorPalette; track c) {
                <button class="swatch" [style.background]="c"
                  [class.sel]="room.floorColor === c"
                  (click)="setRoomColor(c)"></button>
              }
            </div>
            <div class="prop-row" style="margin-bottom:12px">
              <span class="prop-label">Custom colour</span>
              <input type="color" [value]="room.floorColor" (input)="setRoomColor($any($event.target).value)"
                style="width:36px;height:28px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;padding:2px"/>
            </div>

            <div class="section-label">ALL ROOMS</div>
            @for (r of floorPlan.rooms(); track r.id; let i = $index) {
              <div class="room-list-item" [class.active]="floorPlan.selectedRoomIndex() === i"
                (click)="floorPlan.selectedRoomIndex.set(i)">
                <span class="room-dot" [style.background]="r.floorColor"></span>
                <span class="room-list-label">{{ r.label }}</span>
                <span class="room-list-area">{{ r.area }} m²</span>
              </div>
            }
          } @else {
            <!-- No room selected -->
            <div class="section-label">ALL ROOMS</div>
            @if (floorPlan.rooms().length === 0) {
              <div style="font-size:11px;color:var(--muted);padding:8px 0;line-height:1.5">
                No rooms detected yet. Close your walls to form a room polygon in 2D.
              </div>
            }
            @for (r of floorPlan.rooms(); track r.id; let i = $index) {
              <div class="room-list-item" (click)="floorPlan.selectedRoomIndex.set(i)">
                <span class="room-dot" [style.background]="r.floorColor"></span>
                <span class="room-list-label">{{ r.label }}</span>
                <span class="room-list-area">{{ r.area }} m²</span>
              </div>
            }
            <div style="font-size:11px;color:var(--muted);margin-top:10px;line-height:1.5">
              Click a room in 2D to select and edit its name, type and floor colour.
            </div>
          }
        }

        @if (activeTab() === 'History') {
          <div class="section-label">EDIT HISTORY</div>
          @for (entry of history.entries(); track entry.id) {
            <div class="hist-item" [class.hist-undone]="entry.undone">
              <span class="hist-dot" [class.undone]="entry.undone"></span>
              <span class="hist-label">{{ entry.label }}</span>
            </div>
          }
          @if (history.entries().length === 0) {
            <div style="font-size:11px;color:var(--muted);padding:8px 0">No actions yet</div>
          }
        }

      </div>
    </div>
  `,
})
export class PropertiesPanelComponent {
  readonly state = inject(StudioStateService);
  readonly history = inject(HistoryService);
  readonly floorPlan = inject(FloorPlanService);
  readonly sceneEngine = inject(SceneEngine);
  readonly metaEngine = inject(MetadataEngine);

  readonly activeTab = signal('Overview');

  readonly activeTabs = computed(() => {
    const is2d = this.state.viewMode() === '2d';
    switch (this.state.selectionState()) {
      case 'furniture':
        if (is2d) {
          const t = this.floorPlan.selectedType();
          if (t === 'door') return ['Door', 'History'];
          if (t === 'window') return ['Window', 'History'];
        }
        return ['Properties', 'Transform', 'History'];
      case 'wall': return ['Wall', 'History'];
      case 'room': return ['Room', 'History'];
      default: return ['Overview', 'History'];
    }
  });

  readonly selectedObj = computed(() => this.sceneEngine.selectedObject());

  readonly metaProps = computed((): PropertyDef[] => {
    const obj = this.selectedObj();
    if (!obj) return [];
    return this.metaEngine.getProperties(obj.assetId);
  });

  readonly floorArea = computed(() =>
    +(this.state.roomSize().width * this.state.roomSize().depth).toFixed(1),
  );

  readonly wallColors = ['#F5F0E8', '#E8E0D0', '#D4C4A8', '#C8D0D8', '#B0B8C8', '#8C9BB0', '#4A5568', '#1A202C'];
  readonly floorMaterials: { id: FloorMaterial; label: string }[] = [
    { id: 'wood', label: 'Wood' }, { id: 'tile', label: 'Tile' },
    { id: 'marble', label: 'Marble' }, { id: 'concrete', label: 'Concrete' },
  ];
  readonly furnitureColors = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#D97706', '#16A34A', '#0891B2', '#E2E8F0'];
  readonly materials = ['Fabric', 'Leather', 'Velvet', 'Wood', 'Metal', 'Rattan'];
  readonly xyzAxes = [{ i: 0, label: 'X' }, { i: 1, label: 'Y' }, { i: 2, label: 'Z' }] as const;

  readonly roomColorPalette = ROOM_COLORS.concat([
    '#FFF7ED', '#F0FDF4', '#FEF9C3', '#F5F3FF',
    '#FFF1F2', '#ECFEFF', '#F8FAFC', '#E2E8F0',
  ]);

  readonly roomTypes: { value: RoomType; label: string; icon: string }[] = [
    { value: 'living',   label: 'Living',   icon: '🛋' },
    { value: 'bedroom',  label: 'Bedroom',  icon: '🛏' },
    { value: 'kitchen',  label: 'Kitchen',  icon: '🍳' },
    { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
    { value: 'hall',     label: 'Hall',     icon: '🚪' },
    { value: 'dining',   label: 'Dining',   icon: '🍽' },
    { value: 'balcony',  label: 'Balcony',  icon: '🌿' },
    { value: 'custom',   label: 'Custom',   icon: '✏️' },
  ];

  setRoomLabel(label: string): void {
    const i = this.floorPlan.selectedRoomIndex();
    if (i < 0) return;
    this.floorPlan.setRoomOverride(i, { label });
  }

  setRoomType(type: RoomType): void {
    const i = this.floorPlan.selectedRoomIndex();
    if (i < 0) return;
    this.floorPlan.setRoomOverride(i, { type });
  }

  setRoomColor(color: string): void {
    const i = this.floorPlan.selectedRoomIndex();
    if (i < 0) return;
    this.floorPlan.setRoomOverride(i, { floorColor: color });
  }

  setPosition(axis: number, value: number): void {
    const obj = this.selectedObj();
    if (!obj) return;
    const position = [...obj.position] as [number, number, number];
    position[axis] = value;
    this.sceneEngine.updateObject(obj.id, { position });
    this.history.push('Move object');
  }

  setRotation(axis: number, value: number): void {
    const obj = this.selectedObj();
    if (!obj) return;
    const rotation = [...obj.rotation] as [number, number, number];
    rotation[axis] = value;
    this.sceneEngine.updateObject(obj.id, { rotation });
    this.history.push('Rotate object');
  }

  setScale(axis: number, value: number): void {
    const obj = this.selectedObj();
    if (!obj) return;
    if (value <= 0) return;
    const scale = [...obj.scale] as [number, number, number];
    scale[axis] = value;
    this.sceneEngine.updateObject(obj.id, { scale });
    this.history.push('Scale object');
  }

  deleteSelected(): void {
    const obj = this.selectedObj();
    if (!obj) return;
    this.sceneEngine.removeObject(obj.id);
    this.state.setSelectionState('none');
    this.history.push('Delete object');
  }

  setWallColor(c: string): void {
    const w = this.floorPlan.selectedWall();
    if (!w) return;
    this.floorPlan.snapshot();
    this.floorPlan.walls.update(ws => ws.map(wall => wall.id === w.id ? { ...wall, meta: { ...wall.meta, color: c } } : wall));
  }

  setWallThickness(v: number): void {
    const w = this.floorPlan.selectedWall();
    if (!w || v < 50 || v > 500) return;
    this.floorPlan.snapshot();
    this.floorPlan.walls.update(ws => ws.map(wall => wall.id === w.id ? { ...wall, meta: { ...wall.meta, thickness: v } } : wall));
  }

  setWallHeight(v: number): void {
    const w = this.floorPlan.selectedWall();
    if (!w || v < 2000 || v > 6000) return;
    this.floorPlan.snapshot();
    this.floorPlan.walls.update(ws => ws.map(wall => wall.id === w.id ? { ...wall, meta: { ...wall.meta, height: v } } : wall));
  }

  constructor() {
    effect(() => { this.activeTab.set(this.activeTabs()[0]); });
  }
}
