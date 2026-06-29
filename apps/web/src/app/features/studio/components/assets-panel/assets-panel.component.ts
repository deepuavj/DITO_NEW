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

interface GlbItem { id: string; name: string; blobUrl: string; }
interface Draw2DItem { tool: DrawTool; label: string; desc: string; svgPath: string; }

// ─── SVG icons ────────────────────────────────────────────────────────────────
const SOFA_IC     = `<path d="M3 15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3z"/><path d="M5 13V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 19h18"/>`;
const CHAIR_IC    = `<path d="M6 20V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/><path d="M4 14h16"/><path d="M6 20h12"/>`;
const TABLE_IC    = `<path d="M3 6h18M6 6v12M18 6v12M6 18h12"/>`;
const BED_IC      = `<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 10v4"/><line x1="2" y1="20" x2="22" y2="20"/>`;
const WARDROBE_IC = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="9" cy="12" r="0.8" fill="currentColor"/><circle cx="15" cy="12" r="0.8" fill="currentColor"/>`;
const LAMP_IC     = `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>`;
const BOX_IC      = `<path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/>`;
const SELECT_IC   = `<path d="M4 4l7.07 17 2.51-7.42L21 11.07z"/>`;
const PAN_IC      = `<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 9.5V6a2 2 0 0 0-4 0v8l-1.7-3.4a2 2 0 0 0-3.3 2.2l3.6 5.8A6 6 0 0 0 10 22h2a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0"/>`;
const WALL_IC     = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="15" y1="15" x2="15" y2="21"/>`;
const DOOR_IC     = `<path d="M13 4H6a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M13 20V4l6 3v13"/><circle cx="16" cy="12" r="0.5" fill="currentColor"/>`;
const WINDOW_IC   = `<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/>`;
const MEASURE_IC  = `<path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2"/>`;
const CURVE_IC    = `<path d="M3 17C3 17 7 3 12 12C17 21 21 7 21 7"/><circle cx="3" cy="17" r="1.5" fill="currentColor"/><circle cx="21" cy="7" r="1.5" fill="currentColor"/>`;
const SEARCH_IC   = `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`;
const CHEVRON_D   = `<polyline points="6 9 12 15 18 9"/>`;
const CHEVRON_R   = `<polyline points="9 18 15 12 9 6"/>`;
const REFRESH_IC  = `<path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/>`;
const GLB_IC      = `<path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="m3.3 7 8.7 5 8.7-5"/><line x1="12" y1="22" x2="12" y2="12"/>`;
const CLOSE_IC    = `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`;

function svgStr(paths: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function iconForType(type?: string): string {
  if (!type) return BOX_IC;
  if (type === 'sofa' || type === 'loveseat') return SOFA_IC;
  if (type === 'chair' || type === 'ottoman') return CHAIR_IC;
  if (type.includes('table')) return TABLE_IC;
  if (type === 'bed') return BED_IC;
  if (type === 'wardrobe' || type === 'bookshelf') return WARDROBE_IC;
  if (type.includes('lamp') || type.includes('light')) return LAMP_IC;
  return BOX_IC;
}

function snapIcon(surface?: string): string {
  if (surface === 'ceiling') return '⬆️';
  if (surface === 'wall') return '↔️';
  if (surface === 'surface') return '📐';
  return '⬇️';
}

interface CatGroup { cat: Category; items: Asset[]; open: boolean; }

@Component({
  selector: 'dito-furniture-library',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display:flex; flex-direction:column; width:220px; flex-shrink:0; }
    .panel { display:flex; flex-direction:column; width:220px; height:100%; overflow:hidden; border-right:1px solid var(--border); background:var(--panel-bg); }

    /* header */
    .panel-hdr { display:flex; align-items:center; justify-content:space-between; padding:10px 12px 6px; }
    .panel-title { font-size:9px; font-weight:700; letter-spacing:.12em; color:var(--muted); }
    .icon-btn { width:20px; height:20px; background:none; border:none; color:var(--muted); cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; border-radius:3px; flex-shrink:0; }
    .icon-btn:hover { color:var(--fg); background:rgba(255,255,255,.06); }
    .icon-btn svg { width:12px; height:12px; }

    /* search */
    .search-wrap { display:flex; align-items:center; gap:6px; margin:0 8px 8px; background:var(--input-bg); border:1px solid var(--border); border-radius:7px; padding:5px 9px; }
    .search-wrap svg { width:12px; height:12px; color:var(--muted); flex-shrink:0; }
    .search-wrap input { flex:1; background:none; border:none; outline:none; color:var(--fg); font-size:11px; }
    .search-wrap input::placeholder { color:var(--muted); }

    /* state messages */
    .state-msg { padding:20px 12px; font-size:11px; color:var(--muted); text-align:center; line-height:1.5; }
    .state-msg.err { color:#EF4444; }
    .retry-btn { margin-top:8px; padding:5px 12px; background:rgba(59,130,246,.15); border:1px solid rgba(59,130,246,.35); border-radius:6px; color:#93B4FF; font-size:11px; cursor:pointer; }

    /* scroll area */
    .scroll { flex:1; overflow-y:auto; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.07) transparent; }

    /* category */
    .cat { border-bottom:1px solid var(--border); }
    .cat-hdr { display:flex; align-items:center; gap:7px; width:100%; padding:7px 10px; background:none; border:none; color:var(--muted); font-size:11px; cursor:pointer; text-align:left; transition:all 120ms; }
    .cat-hdr:hover { background:rgba(255,255,255,.03); color:var(--fg); }
    .cat-hdr.open { color:var(--fg); }
    .cat-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .cat-name { flex:1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cat-count { font-size:9px; background:rgba(255,255,255,.08); padding:1px 5px; border-radius:6px; flex-shrink:0; }
    .cat-chev { width:10px; height:10px; flex-shrink:0; transition:transform 140ms; }
    .cat-chev svg { width:100%; height:100%; }
    .cat-chev.open { transform:rotate(90deg); }

    /* asset grid */
    .asset-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; padding:3px 7px 7px; }
    .asset-card { display:flex; flex-direction:column; align-items:center; gap:5px; padding:10px 5px 8px; background:var(--input-bg); border:1px solid var(--border); border-radius:8px; cursor:grab; transition:all 140ms; text-align:center; position:relative; user-select:none; }
    .asset-card:hover { border-color:rgba(59,130,246,.5); background:rgba(59,130,246,.08); transform:translateY(-1px); box-shadow:0 4px 10px rgba(0,0,0,.15); }
    .asset-card:active { cursor:grabbing; transform:translateY(0); }
    .asset-card.dragging { opacity:.5; }
    .card-thumb { width:34px; height:34px; border-radius:7px; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; }
    .card-thumb img { width:100%; height:100%; object-fit:cover; border-radius:7px; }
    .card-thumb svg { width:22px; height:22px; }
    .card-name { font-size:9.5px; color:var(--fg); line-height:1.3; font-weight:500; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:0 2px; }
    .card-meta { font-size:9px; color:var(--muted); display:flex; align-items:center; gap:3px; }
    .snap-badge { font-size:9px; }
    .glb-badge { width:8px; height:8px; border-radius:50%; background:#10B981; flex-shrink:0; title:"Has 3D model"; }

    /* 2D tools */
    .section { padding:6px 8px 4px; }
    .section-label { font-size:9px; font-weight:700; letter-spacing:.1em; color:var(--muted); margin-bottom:5px; }
    .import-btn { display:flex; align-items:center; justify-content:center; gap:6px; width:100%; padding:8px; background:var(--input-bg); border:1px dashed var(--border); border-radius:7px; color:var(--muted); font-size:11px; cursor:pointer; transition:all 140ms; box-sizing:border-box; }
    .import-btn:hover { border-color:rgba(59,130,246,.4); color:#93B4FF; }
    .import-btn svg { width:13px; height:13px; flex-shrink:0; }
    .dxf-msg { font-size:10px; color:#F59E0B; padding:3px 8px 6px; }
    .tool-row { display:flex; align-items:center; gap:9px; padding:7px 9px; border-radius:7px; border:1px solid transparent; cursor:pointer; transition:all 120ms; margin-bottom:2px; }
    .tool-row:hover { background:rgba(255,255,255,.04); border-color:var(--border); }
    .tool-row.active { background:rgba(59,130,246,.12); border-color:rgba(59,130,246,.35); }
    .tool-ic { width:17px; height:17px; flex-shrink:0; color:var(--muted); }
    .tool-row.active .tool-ic { color:#93B4FF; }
    .tool-ic svg { width:100%; height:100%; }
    .tool-info { flex:1; min-width:0; }
    .tool-name { font-size:11.5px; font-weight:600; color:var(--fg); }
    .tool-desc { font-size:9.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .snap-grid { display:grid; grid-template-columns:1fr 1fr; gap:3px; padding:3px 8px 10px; }
    .snap-btn { padding:5px 0; background:var(--input-bg); border:1px solid var(--border); border-radius:6px; color:var(--muted); font-size:10px; cursor:pointer; transition:all 120ms; font-weight:500; }
    .snap-btn.on { background:rgba(59,130,246,.15); border-color:rgba(59,130,246,.4); color:#93B4FF; }

    /* custom GLB */
    .glb-section { border-top:1px solid var(--border); padding:6px 8px 4px; }
    .glb-import-btn { display:flex; align-items:center; justify-content:center; gap:5px; width:100%; padding:9px; background:var(--input-bg); border:1px dashed rgba(59,130,246,.4); border-radius:7px; color:#93B4FF; font-size:11px; cursor:pointer; transition:all 140ms; font-weight:500; box-sizing:border-box; }
    .glb-import-btn:hover { background:rgba(59,130,246,.08); border-color:rgba(59,130,246,.7); }
    .glb-import-btn svg { width:13px; height:13px; flex-shrink:0; }
    .glb-item { display:flex; align-items:center; gap:7px; padding:6px 8px; background:var(--input-bg); border:1px solid var(--border); border-radius:7px; margin-bottom:3px; cursor:grab; }
    .glb-item:hover { border-color:rgba(59,130,246,.4); }
    .glb-item-icon { width:24px; height:24px; background:rgba(59,130,246,.12); border-radius:5px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#93B4FF; }
    .glb-item-icon svg { width:13px; height:13px; }
    .glb-item-name { flex:1; font-size:10px; font-weight:500; color:var(--fg); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .glb-remove { width:16px; height:16px; background:none; border:none; color:var(--muted); cursor:pointer; padding:0; flex-shrink:0; display:flex; align-items:center; justify-content:center; border-radius:3px; }
    .glb-remove:hover { color:#EF4444; }
    .glb-remove svg { width:11px; height:11px; }
    .glb-msg { font-size:10px; padding:3px 0 5px; }
    .glb-msg.ok { color:#22C55E; }
    .glb-msg.err { color:#EF4444; }
  `],
  template: `
    <div class="panel">

      <!-- ─── 3D mode: Furniture Library ─────────────────────────────────── -->
      @if (state.viewMode() === '3d') {

        <div class="panel-hdr">
          <span class="panel-title">FURNITURE LIBRARY</span>
          <button class="icon-btn" title="Reload" (click)="reload()" [innerHTML]="safe(REFRESH_IC)"></button>
        </div>

        <div class="search-wrap">
          <span [innerHTML]="safe(SEARCH_IC)"></span>
          <input type="text" placeholder="Search assets…" [value]="searchQ()"
            (input)="searchQ.set($any($event.target).value)" />
        </div>

        <!-- loading -->
        @if (loading()) {
          <div class="state-msg">Loading furniture library…</div>

        <!-- error -->
        } @else if (loadErr()) {
          <div class="state-msg err">
            {{ loadErr() }}<br/>
            <button class="retry-btn" (click)="reload()">Retry</button>
          </div>

        <!-- empty -->
        } @else if (catGroups().length === 0) {
          <div class="state-msg">
            No assets found.<br/>Add some in Asset Management.
          </div>

        <!-- categories + assets -->
        } @else {
          <div class="scroll">
            @for (g of filteredGroups(); track g.cat.id) {
              <div class="cat">
                <button class="cat-hdr" [class.open]="openCats().has(g.cat.id)"
                  (click)="toggleCat(g.cat.id)">
                  <span class="cat-dot" [style.background]="g.cat.color"></span>
                  <span class="cat-name" [title]="g.cat.name">{{ g.cat.icon }} {{ g.cat.name }}</span>
                  <span class="cat-count">{{ g.items.length }}</span>
                  <span class="cat-chev" [class.open]="openCats().has(g.cat.id)"
                    [innerHTML]="safe(openCats().has(g.cat.id) ? CHEVRON_D : CHEVRON_R)"></span>
                </button>

                @if (openCats().has(g.cat.id)) {
                  <div class="asset-grid">
                    @for (a of g.items; track a.id) {
                      <div class="asset-card"
                        draggable="true"
                        (dragstart)="onDragStart($event, a)"
                        (dragend)="draggingId.set(null)"
                        [class.dragging]="draggingId() === a.id"
                        [title]="a.name">

                        <!-- thumbnail or type icon -->
                        <div class="card-thumb"
                          [style.background]="g.cat.color + '22'">
                          @if (a.thumbnailUrl) {
                            <img [src]="a.thumbnailUrl" [alt]="a.name"
                              (error)="$any($event.target).style.display='none'" />
                          }
                          <span [style.color]="g.cat.color"
                            [innerHTML]="safe(typeIcon(a))"></span>
                        </div>

                        <div class="card-name">{{ a.name }}</div>

                        <div class="card-meta">
                          <span class="snap-badge" [title]="snapLabel(a)">{{ snapIc(a) }}</span>
                          @if (a.glbUrl) {
                            <span class="glb-badge" title="Has 3D model file"></span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- custom GLB section -->
            <div class="glb-section">
              <div class="section-label">CUSTOM MODELS</div>
              @for (item of glbItems; track item.id) {
                <div class="glb-item" draggable="true" (dragstart)="onGlbDragStart($event, item)">
                  <span class="glb-item-icon" [innerHTML]="safe(GLB_IC)"></span>
                  <span class="glb-item-name" [title]="item.name">{{ item.name }}</span>
                  <button class="glb-remove" (click)="removeGlb(item.id)"
                    [innerHTML]="safe(CLOSE_IC)"></button>
                </div>
              }
              <button class="glb-import-btn" (click)="glbInput.click()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Import .glb / .gltf
              </button>
              <input #glbInput type="file" accept=".glb,.gltf" style="display:none"
                (change)="onGlbUpload($event)" />
              @if (glbMsg) {
                <div class="glb-msg" [class.ok]="glbOk" [class.err]="!glbOk">{{ glbMsg }}</div>
              }
            </div>
          </div>
        }

      <!-- ─── 2D mode: Drawing tools ──────────────────────────────────────── -->
      } @else {

        <div class="panel-hdr">
          <span class="panel-title">DRAWING ELEMENTS</span>
        </div>

        <div class="scroll">
          <div class="section">
            <div class="section-label">IMPORT</div>
            <button class="import-btn" (click)="dxfInput.click()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Import DXF / Floor Plan
            </button>
            <input #dxfInput type="file" accept=".dxf,.dwg" style="display:none"
              (change)="onDxfUpload($event)" />
            @if (dxfBanner) { <div class="dxf-msg">{{ dxfBanner }}</div> }
          </div>

          <div class="section">
            <div class="section-label">TOOLS</div>
            @for (t of draw2dItems; track t.tool) {
              <div class="tool-row" [class.active]="state.drawTool() === t.tool"
                (click)="state.setDrawTool(t.tool)">
                <span class="tool-ic" [innerHTML]="safe(t.svgPath)"></span>
                <div class="tool-info">
                  <div class="tool-name">{{ t.label }}</div>
                  <div class="tool-desc">{{ t.desc }}</div>
                </div>
              </div>
            }
          </div>

          <div class="section">
            <div class="section-label">SNAPPING</div>
          </div>
          <div class="snap-grid">
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
  readonly state    = inject(StudioStateService);
  readonly floorPlan = inject(FloorPlanService);
  private readonly san  = inject(DomSanitizer);
  private readonly meta = inject(MetadataEngine);
  private readonly assetSvc = inject(AssetService);

  readonly assetSelected = output<Asset>();

  // ── State signals ──────────────────────────────────────────────────────────
  readonly loading  = signal(false);
  readonly loadErr  = signal<string | null>(null);
  readonly searchQ  = signal('');
  readonly openCats = signal<Set<string>>(new Set());
  readonly draggingId = signal<string | null>(null);

  private readonly allCategories = signal<Category[]>([]);
  private readonly allAssets     = signal<Asset[]>([]);

  // ── Derived ────────────────────────────────────────────────────────────────
  readonly catGroups = computed<CatGroup[]>(() => {
    const cats = this.allCategories();
    const assets = this.allAssets();
    const groups: CatGroup[] = cats
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(cat => ({ cat, items: assets.filter(a => a.category === cat.name), open: false }))
      .filter(g => g.items.length > 0);
    // Orphans
    const known = new Set(cats.map(c => c.name));
    const orphans = assets.filter(a => !known.has(a.category));
    if (orphans.length) {
      groups.push({ cat: { id: '__other__', name: 'Other', icon: '📦', color: '#6B7280', sortOrder: 999, createdAt: '' }, items: orphans, open: false });
    }
    return groups;
  });

  readonly filteredGroups = computed<CatGroup[]>(() => {
    const q = this.searchQ().toLowerCase().trim();
    if (!q) return this.catGroups();
    return this.catGroups()
      .map(g => ({ ...g, items: g.items.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        ((a.metadata?.['type'] as string) ?? '').includes(q)
      )}))
      .filter(g => g.cat.name.toLowerCase().includes(q) || g.items.length > 0);
  });

  // ── Icon / label helpers ───────────────────────────────────────────────────
  readonly SEARCH_IC  = SEARCH_IC;
  readonly REFRESH_IC = REFRESH_IC;
  readonly CHEVRON_D  = CHEVRON_D;
  readonly CHEVRON_R  = CHEVRON_R;
  readonly GLB_IC     = GLB_IC;
  readonly CLOSE_IC   = CLOSE_IC;

  safe(paths: string): SafeHtml { return this.san.bypassSecurityTrustHtml(svgStr(paths)); }
  typeIcon(a: Asset): string { return iconForType(a.metadata?.['type'] as string | undefined); }
  snapIc(a: Asset): string   { return snapIcon((a.metadata?.['snapRules'] as any)?.surface); }
  snapLabel(a: Asset): string {
    const s = (a.metadata?.['snapRules'] as any)?.surface ?? 'floor';
    return `Snaps to: ${s}`;
  }

  // ── GLB custom import ──────────────────────────────────────────────────────
  glbItems: GlbItem[] = [];
  glbMsg  = '';
  glbOk   = true;
  private glbTimer: ReturnType<typeof setTimeout> | null = null;

  // ── DXF ───────────────────────────────────────────────────────────────────
  dxfBanner = '';
  private dxfTimer: ReturnType<typeof setTimeout> | null = null;

  // ── 2D tools ──────────────────────────────────────────────────────────────
  readonly draw2dItems: Draw2DItem[] = [
    { tool: 'select',  label: 'Select',     svgPath: SELECT_IC,  desc: 'Select & move elements'       },
    { tool: 'pan',     label: 'Pan',        svgPath: PAN_IC,     desc: 'Pan the canvas'               },
    { tool: 'wall',    label: 'Draw Wall',  svgPath: WALL_IC,    desc: 'Click to place wall segments' },
    { tool: 'curve',   label: 'Curve Wall', svgPath: CURVE_IC,   desc: 'Bezier wall (3-click)'        },
    { tool: 'door',    label: 'Door',       svgPath: DOOR_IC,    desc: 'Place door openings'          },
    { tool: 'window',  label: 'Window',     svgPath: WINDOW_IC,  desc: 'Place window openings'        },
    { tool: 'measure', label: 'Measure',    svgPath: MEASURE_IC, desc: 'Measure distances'            },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.loadErr.set(null);
    forkJoin({
      categories: this.assetSvc.listCategories(),
      assets:     this.assetSvc.list({ limit: 500 }),
    }).subscribe({
      next: ({ categories, assets }) => {
        const list: Asset[] = assets.data ?? [];
        // Pre-register all metadata so renderer can pick correct mesh type
        for (const a of list) {
          this.meta.register(a.id, a.metadata ?? {});
          if (a.glbUrl) this.meta.setGlbUrl(a.id, a.glbUrl);
        }
        this.allCategories.set(categories);
        this.allAssets.set(list);
        // Open first category by default
        if (categories.length > 0) {
          this.openCats.set(new Set([categories[0].id]));
        }
        this.loading.set(false);
      },
      error: err => {
        console.error('[FurnitureLibrary] load failed:', err);
        this.loadErr.set('Could not load assets — is the API running?');
        this.loading.set(false);
      },
    });
  }

  toggleCat(catId: string): void {
    this.openCats.update(s => {
      const next = new Set(s);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  // ── Drag and drop (library → 3D scene) ────────────────────────────────────
  onDragStart(event: DragEvent, asset: Asset): void {
    this.draggingId.set(asset.id);
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('application/dito-asset', JSON.stringify({
      id:       asset.id,
      name:     asset.name,
      metadata: asset.metadata ?? {},
      glbUrl:   asset.glbUrl ?? '',
    }));
  }

  onGlbDragStart(event: DragEvent, item: GlbItem): void {
    event.dataTransfer!.effectAllowed = 'copy';
    event.dataTransfer!.setData('application/dito-asset', JSON.stringify({
      id:       item.id,
      name:     item.name,
      metadata: {},
      glbUrl:   item.blobUrl,
    }));
  }

  // ── Local GLB file import ──────────────────────────────────────────────────
  onGlbUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      this.toast('Only .glb and .gltf files are supported', false); return;
    }
    const blobUrl = URL.createObjectURL(file);
    const name    = file.name.replace(/\.(glb|gltf)$/i, '');
    const id      = uid();
    this.meta.register(id, {} as any);
    this.meta.setGlbUrl(id, blobUrl);
    this.glbItems = [...this.glbItems, { id, name, blobUrl }];
    this.toast(`"${name}" ready — drag it into the 3D scene`, true);
  }

  removeGlb(id: string): void {
    const item = this.glbItems.find(i => i.id === id);
    if (item) URL.revokeObjectURL(item.blobUrl);
    this.glbItems = this.glbItems.filter(i => i.id !== id);
  }

  private toast(msg: string, ok: boolean): void {
    this.glbMsg = msg; this.glbOk = ok;
    if (this.glbTimer) clearTimeout(this.glbTimer);
    this.glbTimer = setTimeout(() => { this.glbMsg = ''; }, 5000);
  }

  // ── DXF import ────────────────────────────────────────────────────────────
  onDxfUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file  = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.dwg')) {
      this.showDxf('DWG is proprietary — export to DXF from AutoCAD first'); return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = this.parseDxf(ev.target?.result as string);
      if (!parsed.length) { this.showDxf('No wall entities found in DXF'); return; }
      this.floorPlan.snapshot();
      this.floorPlan.walls.set(parsed);
      this.showDxf(`Imported ${parsed.length} wall segments`);
    };
    reader.readAsText(file);
  }

  private showDxf(msg: string): void {
    this.dxfBanner = msg;
    if (this.dxfTimer) clearTimeout(this.dxfTimer);
    this.dxfTimer = setTimeout(() => { this.dxfBanner = ''; }, 5000);
  }

  private parseDxf(text: string): FPWall[] {
    const layer: FPWall[] = [], all: FPWall[] = [];
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] !== '0') continue;
      const etype = lines[i + 1];
      if (etype === 'LINE') {
        let lyr = ''; const c: Record<string, number> = {};
        for (let j = i + 2; j < Math.min(i + 60, lines.length - 1); j += 2) {
          if (lines[j] === '0') break;
          if (lines[j] === '8') { lyr = lines[j + 1]; continue; }
          const v = parseFloat(lines[j + 1]);
          if (!isNaN(v)) c[lines[j]] = v;
        }
        if (c['10'] !== undefined) {
          const w: FPWall = { id: uid(), start: { x: c['10'], y: -(c['20'] ?? 0) }, end: { x: c['11'] ?? 0, y: -(c['21'] ?? 0) }, meta: { ...DEFAULT_WALL_META } };
          all.push(w);
          if (lyr.toLowerCase() === 'walls') layer.push(w);
        }
      } else if (etype === 'LWPOLYLINE') {
        let lyr = '', closed = false; const xs: number[] = [], ys: number[] = [];
        for (let j = i + 2; j < lines.length - 1; j += 2) {
          if (lines[j] === '0') break;
          if (lines[j] === '8') { lyr = lines[j + 1]; continue; }
          if (lines[j] === '70') { closed = (parseInt(lines[j + 1], 10) & 1) === 1; continue; }
          if (lines[j] === '10') { xs.push(parseFloat(lines[j + 1])); continue; }
          if (lines[j] === '20') { ys.push(parseFloat(lines[j + 1])); continue; }
        }
        if (xs.length >= 2 && lyr.toLowerCase() === 'walls') {
          const v = xs.map((x, k) => ({ x, y: ys[k] ?? 0 }));
          for (let k = 0; k < v.length - 1; k++) { const w: FPWall = { id: uid(), start: v[k], end: v[k + 1], meta: { ...DEFAULT_WALL_META } }; layer.push(w); all.push(w); }
          if (closed && v.length >= 3) { const w: FPWall = { id: uid(), start: v[v.length - 1], end: v[0], meta: { ...DEFAULT_WALL_META } }; layer.push(w); all.push(w); }
        }
      }
    }
    const walls = layer.length ? layer : all;
    if (!walls.length) return [];
    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...allX), maxX = Math.max(...allX), minY = Math.min(...allY), maxY = Math.max(...allY);
    const sc = 600 / (Math.max(maxX - minX, maxY - minY) || 1);
    const ox = (600 - (maxX - minX) * sc) / 2, oy = (600 - (maxY - minY) * sc) / 2;
    return walls.map(w => ({ ...w, start: { x: (w.start.x - minX) * sc + ox, y: (w.start.y - minY) * sc + oy }, end: { x: (w.end.x - minX) * sc + ox, y: (w.end.y - minY) * sc + oy } }));
  }
}
