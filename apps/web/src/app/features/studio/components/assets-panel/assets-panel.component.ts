import { Component, inject, signal, computed, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StudioStateService } from '../../services/studio-state.service';
import { FloorPlanService } from '../../services/floor-plan.service';
import { MetadataEngine } from '../../../../engines/metadata/metadata.engine';
import { AssetService } from '../../../../core/services/asset.service';
import type { FPWall } from '../../services/floor-plan.service';
import type { Asset, Category } from '../../../../core/models/asset.models';
import type { DrawTool } from '../../services/studio-state.service';
import { forkJoin } from 'rxjs';

function uid(): string { return Math.random().toString(36).slice(2, 9); }
const DEFAULT_WALL_META = { thickness: 200, height: 2800, material: 'concrete', color: '#D4C8B8' };

interface GlbItem { id: string; name: string; blobUrl: string }
interface Draw2DItem { tool: DrawTool; label: string; desc: string; svgPath: string; }
interface ApiCategory extends Category { items: Asset[]; open: ReturnType<typeof signal<boolean>>; }

/* SVG icon paths */
const SOFA_IC  = `<path d="M3 15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3z"/><path d="M5 13V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 19h18"/>`;
const TABLE_IC = `<path d="M3 6h18M6 6v12M18 6v12M6 18h12"/>`;
const BED_IC   = `<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 10v4"/><line x1="2" y1="20" x2="22" y2="20"/>`;
const WARDROBE_IC = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="9" cy="12" r="0.8" fill="currentColor"/><circle cx="15" cy="12" r="0.8" fill="currentColor"/>`;
const LAMP_IC     = `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>`;
const BOX_IC      = `<path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/>`;
const SELECT_IC  = `<path d="M4 4l7.07 17 2.51-7.42L21 11.07z"/>`;
const PAN_IC     = `<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 9.5V6a2 2 0 0 0-4 0v8l-1.7-3.4a2 2 0 0 0-3.3 2.2l3.6 5.8A6 6 0 0 0 10 22h2a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0"/>`;
const WALL_IC    = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="15" y1="15" x2="15" y2="21"/>`;
const DOOR_IC    = `<path d="M13 4H6a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M13 20V4l6 3v13"/><circle cx="16" cy="12" r="0.5" fill="currentColor"/>`;
const WINDOW_IC  = `<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/>`;
const MEASURE_IC = `<path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2"/>`;
const CURVE_IC = `<path d="M3 17C3 17 7 3 12 12C17 21 21 7 21 7"/><circle cx="3" cy="17" r="1.5" fill="currentColor"/><circle cx="21" cy="7" r="1.5" fill="currentColor"/>`;
const SEARCH_IC  = `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`;
const CHEVRON_R  = `<polyline points="9 18 15 12 9 6"/>`;
const CHEVRON_D  = `<polyline points="6 9 12 15 18 9"/>`;
const REFRESH_IC = `<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>`;

/** Icon path per category name (falls back to BOX_IC) */
const CAT_ICON_MAP: Record<string, string> = {
  'Sofas & Seating': SOFA_IC,
  'Tables': TABLE_IC,
  'Beds': BED_IC,
  'Storage': WARDROBE_IC,
  'Lighting': LAMP_IC,
};

function svg(paths: string, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/** Pick SVG icon from asset metadata.type */
function iconForAsset(asset: Asset): string {
  const t = asset.metadata?.['type'] as string | undefined;
  if (!t) return BOX_IC;
  if (t === 'sofa' || t === 'loveseat') return SOFA_IC;
  if (t === 'chair' || t === 'ottoman') return `<path d="M6 20V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/><path d="M4 14h16"/><path d="M6 20h12"/>`;
  if (t === 'coffee_table' || t === 'side_table' || t === 'dining_table') return TABLE_IC;
  if (t === 'bed') return BED_IC;
  if (t === 'wardrobe' || t === 'bookshelf') return WARDROBE_IC;
  if (t === 'floor_lamp' || t === 'pendant_light') return LAMP_IC;
  return BOX_IC;
}

@Component({
  selector: 'dito-furniture-library',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: flex; flex-direction: column; width: 220px; flex-shrink: 0; }
    .panel { display: flex; flex-direction: column; width: 220px; height: 100%; overflow: hidden; border-right: 1px solid var(--border); background: var(--panel-bg); }
    .panel-header { display: flex; align-items: center; justify-content: space-between; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); padding: 12px 14px 6px; }
    .refresh-btn { width: 18px; height: 18px; background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 3px; }
    .refresh-btn:hover { color: var(--fg); }
    .refresh-btn svg { width: 12px; height: 12px; }

    /* search */
    .search-box { display: flex; align-items: center; gap: 6px; margin: 0 10px 8px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 7px; padding: 6px 10px; }
    .search-ic { width: 13px; height: 13px; color: var(--muted); flex-shrink: 0; }
    .search-ic svg { width: 100%; height: 100%; }
    .search-input { flex: 1; background: none; border: none; outline: none; color: var(--fg); font-size: 12px; }
    .search-input::placeholder { color: var(--muted); }

    /* loading / error */
    .status-msg { font-size: 11px; color: var(--muted); text-align: center; padding: 24px 12px; }
    .err-msg { color: #EF4444; }

    /* scroll */
    .scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }

    /* category */
    .category { border-bottom: 1px solid var(--border); }
    .cat-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: none; border: none; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 130ms; text-align: left; }
    .cat-header:hover { background: rgba(255,255,255,0.03); color: var(--fg); }
    .cat-header.open { color: var(--fg); }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .cat-label { flex: 1; font-weight: 500; }
    .cat-count { font-size: 10px; background: rgba(255,255,255,0.07); padding: 1px 6px; border-radius: 8px; }
    .cat-chevron { width: 12px; height: 12px; flex-shrink: 0; transition: transform 150ms; }
    .cat-chevron svg { width: 100%; height: 100%; }
    .cat-chevron.open { transform: rotate(90deg); }

    /* item grid */
    .item-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px 8px 8px; }
    .furniture-card { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px 10px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; cursor: grab; transition: all 150ms; text-align: center; }
    .furniture-card:hover { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.08); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .furniture-card:active { cursor: grabbing; }
    .card-icon { width: 26px; height: 26px; }
    .card-icon svg { width: 100%; height: 100%; }
    .card-name { font-size: 10px; color: var(--muted); line-height: 1.3; }

    /* 2D drawing tools */
    .draw-section { padding: 8px 10px 4px; }
    .draw-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
    .draw-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 7px; border: 1px solid transparent; cursor: pointer; transition: all 130ms; margin-bottom: 2px; }
    .draw-item:hover { background: rgba(255,255,255,0.04); border-color: var(--border); }
    .draw-item.active { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.35); }
    .draw-icon { width: 18px; height: 18px; flex-shrink: 0; color: var(--muted); }
    .draw-item.active .draw-icon { color: #93B4FF; }
    .draw-icon svg { width: 100%; height: 100%; }
    .draw-info { flex: 1; min-width: 0; }
    .draw-name { font-size: 12px; font-weight: 600; color: var(--fg); }
    .draw-desc { font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* snapping */
    .snap-grid-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 4px 10px 10px; }
    .snap-btn { padding: 5px 0; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 10px; cursor: pointer; transition: all 130ms; text-align: center; font-weight: 500; }
    .snap-btn.on { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); color: #93B4FF; }

    /* import */
    .import-btn { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 8px 10px; padding: 9px; background: var(--input-bg); border: 1px dashed var(--border); border-radius: 7px; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 150ms; }
    .import-btn:hover { border-color: rgba(59,130,246,0.4); color: #93B4FF; }
    .import-btn svg { width: 14px; height: 14px; }
    .dxf-msg { font-size: 10px; color: #F59E0B; padding: 4px 10px; }
    /* glb imports */
    .glb-section { border-top: 1px solid var(--border); padding: 8px 10px 4px; }
    .glb-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); margin-bottom: 6px; }
    .glb-import-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px; background: var(--input-bg); border: 1px dashed rgba(59,130,246,0.4); border-radius: 7px; color: #93B4FF; font-size: 11px; cursor: pointer; transition: all 150ms; font-weight: 500; }
    .glb-import-btn:hover { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.7); color: #60A5FA; }
    .glb-import-btn svg { width: 15px; height: 15px; flex-shrink: 0; }
    .glb-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 7px; margin-bottom: 4px; cursor: grab; transition: all 130ms; }
    .glb-item:hover { border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.06); }
    .glb-item:active { cursor: grabbing; }
    .glb-thumb { width: 28px; height: 28px; background: rgba(59,130,246,0.15); border-radius: 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #93B4FF; }
    .glb-thumb svg { width: 16px; height: 16px; }
    .glb-name { flex: 1; font-size: 11px; font-weight: 500; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .glb-remove { width: 18px; height: 18px; background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 3px; flex-shrink: 0; }
    .glb-remove:hover { color: #EF4444; background: rgba(239,68,68,0.1); }
    .glb-remove svg { width: 12px; height: 12px; }
    .glb-msg { font-size: 10px; padding: 4px 0; }
    .glb-msg.ok { color: #22C55E; }
    .glb-msg.err { color: #EF4444; }
  `],
  template: `
    <div class="panel">
      @if (state.viewMode() === '3d') {
        <div class="panel-header">
          <span>FURNITURE LIBRARY</span>
          <button class="refresh-btn" title="Reload from server" (click)="loadAssets()" [innerHTML]="svgIcon(REFRESH_IC)"></button>
        </div>
        <div class="search-box">
          <span class="search-ic" [innerHTML]="svgIcon(SEARCH_IC)"></span>
          <input type="text" placeholder="Search items…" [(ngModel)]="searchQuery" class="search-input" />
        </div>
        <div class="scroll">
          @if (loading()) {
            <div class="status-msg">Loading assets…</div>
          } @else if (loadError()) {
            <div class="status-msg err-msg">{{ loadError() }}</div>
          } @else {
            @for (cat of filteredCategories(); track cat.id) {
              <div class="category">
                <button class="cat-header" (click)="toggleCat(cat)" [class.open]="cat.open()">
                  <span class="cat-dot" [style.background]="cat.color"></span>
                  <span class="cat-label">{{ cat.name }}</span>
                  <span class="cat-count">{{ cat.items.length }}</span>
                  <span class="cat-chevron" [class.open]="cat.open()" [innerHTML]="svgIcon(cat.open() ? CHEVRON_D : CHEVRON_R)"></span>
                </button>
                @if (cat.open()) {
                  <div class="item-grid">
                    @for (item of cat.items; track item.id) {
                      <div class="furniture-card" draggable="true"
                        (dragstart)="onDragStart($event, item)"
                        (click)="assetSelected.emit(item)">
                        <span class="card-icon" [style.color]="cat.color" [innerHTML]="svgIcon(iconFor(item))"></span>
                        <div class="card-name">{{ item.name }}</div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>
        <!-- GLB import section -->
        <div class="glb-section">
          <div class="glb-label">CUSTOM MODELS</div>
          @for (item of glbItems; track item.id) {
            <div class="glb-item" draggable="true" (dragstart)="onGlbDragStart($event, item)">
              <span class="glb-thumb">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
              </span>
              <span class="glb-name" [title]="item.name">{{ item.name }}</span>
              <button class="glb-remove" title="Remove" (click)="removeGlbItem(item.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          }
          <button class="glb-import-btn" (click)="glbInput.click()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import .glb / .gltf file
          </button>
          <input #glbInput type="file" accept=".glb,.gltf" style="display:none" (change)="onGlbUpload($event)"/>
          @if (glbMsg) { <div class="glb-msg" [class.ok]="glbMsgOk" [class.err]="!glbMsgOk">{{ glbMsg }}</div> }
        </div>
      } @else {
        <div class="panel-header"><span>DRAWING ELEMENTS</span></div>
        <div class="scroll">
          <div class="draw-section">
            <div class="draw-label">IMPORT</div>
            <button class="import-btn" (click)="dxfInput.click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Import DXF / Floor Plan
            </button>
            <input #dxfInput type="file" accept=".dxf,.dwg" style="display:none" (change)="onDxfUpload($event)"/>
            @if (dxfBanner) { <div class="dxf-msg">{{ dxfBanner }}</div> }
          </div>
          <div class="draw-section">
            <div class="draw-label">TOOLS</div>
            @for (item of draw2dItems; track item.tool) {
              <div class="draw-item" [class.active]="state.drawTool()===item.tool" (click)="state.setDrawTool(item.tool)">
                <span class="draw-icon" [innerHTML]="svgIcon(item.svgPath)"></span>
                <div class="draw-info">
                  <div class="draw-name">{{ item.label }}</div>
                  <div class="draw-desc">{{ item.desc }}</div>
                </div>
              </div>
            }
          </div>
          <div class="draw-section">
            <div class="draw-label">SNAPPING</div>
          </div>
          <div class="snap-grid-wrap">
            <button class="snap-btn" [class.on]="state.snapGrid()"     (click)="state.toggleSnap('grid')">Grid</button>
            <button class="snap-btn" [class.on]="state.snapWall()"     (click)="state.toggleSnap('wall')">Wall</button>
            <button class="snap-btn" [class.on]="state.snapAngle()"    (click)="state.toggleSnap('angle')">Angle</button>
            <button class="snap-btn" [class.on]="state.snapCenter()"   (click)="state.toggleSnap('center')">Center</button>
            <button class="snap-btn" [class.on]="state.snapEdge()"     (click)="state.toggleSnap('edge')">Edge</button>
            <button class="snap-btn" [class.on]="state.snapMidpoint()" (click)="state.toggleSnap('midpoint')">Midpoint</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class FurnitureLibraryComponent implements OnInit {
  readonly state = inject(StudioStateService);
  private readonly san = inject(DomSanitizer);
  readonly floorPlan = inject(FloorPlanService);
  private readonly metadataEngine = inject(MetadataEngine);
  private readonly assetService = inject(AssetService);
  readonly assetSelected = output<Asset>();

  searchQuery = '';
  dxfBanner: string | null = null;
  private dxfBannerTimer: ReturnType<typeof setTimeout> | null = null;
  glbItems: GlbItem[] = [];
  glbMsg: string | null = null;
  glbMsgOk = true;
  private glbMsgTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly apiCategories = signal<ApiCategory[]>([]);

  readonly SEARCH_IC = SEARCH_IC;
  readonly CHEVRON_R = CHEVRON_R;
  readonly CHEVRON_D = CHEVRON_D;
  readonly REFRESH_IC = REFRESH_IC;

  svgIcon(paths: string): SafeHtml { return this.san.bypassSecurityTrustHtml(svg(paths)); }
  iconFor(asset: Asset): string { return iconForAsset(asset); }

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    const cats = this.apiCategories();
    if (!q) return cats;
    return cats
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(q) || (i.tags ?? []).some(t => t.toLowerCase().includes(q))) }))
      .filter(cat => cat.name.toLowerCase().includes(q) || cat.items.length > 0);
  });

  readonly draw2dItems: Draw2DItem[] = [
    { tool: 'select',  label: 'Select',    svgPath: SELECT_IC,  desc: 'Select & move elements'       },
    { tool: 'pan',     label: 'Pan',       svgPath: PAN_IC,     desc: 'Pan the canvas'               },
    { tool: 'wall',    label: 'Draw Wall', svgPath: WALL_IC,    desc: 'Click to place wall segments'  },
    { tool: 'curve',   label: 'Curve Wall', svgPath: CURVE_IC,  desc: 'Draw curved bezier wall (3-click)' },
    { tool: 'door',    label: 'Door',      svgPath: DOOR_IC,    desc: 'Place door openings'          },
    { tool: 'window',  label: 'Window',    svgPath: WINDOW_IC,  desc: 'Place window openings'        },
    { tool: 'measure', label: 'Measure',   svgPath: MEASURE_IC, desc: 'Measure distances'            },
  ];

  ngOnInit(): void {
    this.loadAssets();
  }

  loadAssets(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      categories: this.assetService.listCategories(),
      assets: this.assetService.list({ limit: 500 }),
    }).subscribe({
      next: ({ categories, assets }) => {
        const allAssets: Asset[] = assets.data ?? [];
        // Register each asset's metadata in the MetadataEngine
        for (const asset of allAssets) {
          this.metadataEngine.register(asset.id, asset.metadata ?? {});
          if (asset.glbUrl) this.metadataEngine.setGlbUrl(asset.id, asset.glbUrl);
        }
        // Group assets by category
        const catList: ApiCategory[] = categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat, idx) => ({
            ...cat,
            items: allAssets.filter(a => a.category === cat.name),
            open: signal(idx === 0),
          }));
        // Uncategorised bucket for assets whose category doesn't match
        const knownCatNames = new Set(categories.map(c => c.name));
        const orphans = allAssets.filter(a => !knownCatNames.has(a.category));
        if (orphans.length) {
          catList.push({
            id: '__orphan__', name: 'Other', icon: '📦', color: '#6B7280',
            sortOrder: 999, createdAt: '', items: orphans, open: signal(false),
          });
        }
        this.apiCategories.set(catList);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set('Failed to load assets — is the API running?');
        this.loading.set(false);
        console.error('[FurnitureLibrary] load error:', err);
      },
    });
  }

  toggleCat(cat: ApiCategory): void {
    const wasOpen = cat.open();
    this.apiCategories().forEach(c => c.open.set(false));
    if (!wasOpen) cat.open.set(true);
  }

  onDragStart(event: DragEvent, item: Asset): void {
    event.dataTransfer?.setData('application/dito-asset', JSON.stringify({
      id: item.id,
      name: item.name,
      metadata: item.metadata ?? {},
      glbUrl: item.glbUrl ?? '',
    }));
  }

  onGlbUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      this.showGlbMsg('Only .glb and .gltf files are supported', false);
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.(glb|gltf)$/i, '');
    const id = uid();
    this.metadataEngine.register(id, {} as any);
    this.metadataEngine.setGlbUrl(id, blobUrl);
    this.glbItems = [...this.glbItems, { id, name, blobUrl }];
    this.showGlbMsg(`"${name}" imported — drag to 3D scene`, true);
  }

  onGlbDragStart(event: DragEvent, item: GlbItem): void {
    event.dataTransfer?.setData('application/dito-asset', JSON.stringify({
      id: item.id, name: item.name, metadata: {}, glbUrl: item.blobUrl,
    }));
  }

  removeGlbItem(id: string): void {
    const item = this.glbItems.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.blobUrl);
    this.glbItems = this.glbItems.filter(i => i.id !== id);
  }

  private showGlbMsg(msg: string, ok: boolean): void {
    this.glbMsg = msg;
    this.glbMsgOk = ok;
    if (this.glbMsgTimer) clearTimeout(this.glbMsgTimer);
    this.glbMsgTimer = setTimeout(() => { this.glbMsg = null; }, 5000);
  }

  onDxfUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.dwg')) {
      this.showDxfBanner('DWG is proprietary — export to DXF from AutoCAD first');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = this.parseDxf(ev.target?.result as string);
      if (parsed.length === 0) { this.showDxfBanner('No wall entities found in DXF'); return; }
      this.floorPlan.snapshot();
      this.floorPlan.walls.set(parsed);
      this.showDxfBanner(`Imported ${parsed.length} wall segments`);
    };
    reader.readAsText(file);
    input.value = '';
  }

  private showDxfBanner(msg: string): void {
    this.dxfBanner = msg;
    if (this.dxfBannerTimer) clearTimeout(this.dxfBannerTimer);
    this.dxfBannerTimer = setTimeout(() => { this.dxfBanner = null; }, 5000);
  }

  private parseDxf(text: string): FPWall[] {
    const wallsLayer: FPWall[] = [];
    const wallsAll:   FPWall[] = [];
    const lines = text.split('\n').map(l => l.trim());

    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] !== '0') continue;
      const etype = lines[i + 1];

      if (etype === 'LINE') {
        let layer = '';
        const c: Record<string, number> = {};
        for (let j = i + 2; j < Math.min(i + 60, lines.length - 1); j += 2) {
          const code = lines[j];
          if (code === '0') break;
          if (code === '8') { layer = lines[j + 1]; continue; }
          const v = parseFloat(lines[j + 1]);
          if (!isNaN(v)) c[code] = v;
        }
        if (c['10'] !== undefined) {
          const wall: FPWall = {
            id: uid(),
            start: { x: c['10'], y: -(c['20'] ?? 0) },
            end:   { x: c['11'] ?? 0, y: -(c['21'] ?? 0) },
            meta: { ...DEFAULT_WALL_META },
          };
          wallsAll.push(wall);
          if (layer.toLowerCase() === 'walls') wallsLayer.push(wall);
        }
      } else if (etype === 'LWPOLYLINE') {
        let layer = '';
        let closed = false;
        const xs: number[] = [];
        const ys: number[] = [];
        for (let j = i + 2; j < lines.length - 1; j += 2) {
          const code = lines[j];
          if (code === '0') break;
          if (code === '8') { layer = lines[j + 1]; continue; }
          if (code === '70') { closed = (parseInt(lines[j + 1], 10) & 1) === 1; continue; }
          if (code === '10') { xs.push(parseFloat(lines[j + 1])); continue; }
          if (code === '20') { ys.push(parseFloat(lines[j + 1])); continue; }
        }
        if (xs.length >= 2 && layer.toLowerCase() === 'walls') {
          const verts = xs.map((x, k) => ({ x, y: ys[k] ?? 0 }));
          for (let k = 0; k < verts.length - 1; k++) {
            wallsLayer.push({ id: uid(), start: verts[k], end: verts[k + 1], meta: { ...DEFAULT_WALL_META } });
            wallsAll.push(wallsLayer[wallsLayer.length - 1]);
          }
          if (closed && verts.length >= 3) {
            wallsLayer.push({ id: uid(), start: verts[verts.length - 1], end: verts[0], meta: { ...DEFAULT_WALL_META } });
            wallsAll.push(wallsLayer[wallsLayer.length - 1]);
          }
        }
      }
    }

    const walls = wallsLayer.length > 0 ? wallsLayer : wallsAll;
    if (!walls.length) return walls;

    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    const sc   = 600 / (Math.max(maxX - minX, maxY - minY) || 1);
    const ox   = (600 - (maxX - minX) * sc) / 2;
    const oy   = (600 - (maxY - minY) * sc) / 2;
    return walls.map(w => ({
      ...w,
      start: { x: (w.start.x - minX) * sc + ox, y: (w.start.y - minY) * sc + oy },
      end:   { x: (w.end.x   - minX) * sc + ox, y: (w.end.y   - minY) * sc + oy },
    }));
  }
}
