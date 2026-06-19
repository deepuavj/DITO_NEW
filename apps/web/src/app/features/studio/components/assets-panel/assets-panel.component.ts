import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';
import type { Asset } from '../../../../core/models/asset.models';
import type { DrawTool } from '../../services/studio-state.service';

interface FurnitureItem { id: string; name: string; price: number; svgPath: string; }
interface FurnitureCategory {
  id: string; label: string; count: number; color: string; svgPath: string;
  open: ReturnType<typeof signal<boolean>>; items: FurnitureItem[];
}
interface Draw2DItem { tool: DrawTool; label: string; desc: string; svgPath: string; }

/* SVG icon paths */
const SOFA_IC  = `<path d="M3 15a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3z"/><path d="M5 13V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 19h18"/>`;
const CHAIR_IC = `<path d="M6 20V10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10"/><path d="M4 14h16"/><path d="M6 20h12"/>`;
const TABLE_IC = `<path d="M3 6h18M6 6v12M18 6v12M6 18h12"/>`;
const BED_IC   = `<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 10v4"/><line x1="2" y1="20" x2="22" y2="20"/>`;
const WARDROBE_IC = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><circle cx="9" cy="12" r="0.8" fill="currentColor"/><circle cx="15" cy="12" r="0.8" fill="currentColor"/>`;
const SHELF_IC    = `<rect x="3" y="4" width="18" height="2"/><rect x="3" y="11" width="18" height="2"/><rect x="3" y="18" width="18" height="2"/><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/>`;
const LAMP_IC     = `<path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>`;
const PEND_IC     = `<line x1="12" y1="2" x2="12" y2="6"/><path d="M7 6h10l2 8H5z"/><line x1="5" y1="14" x2="19" y2="14"/><path d="M8 14v4M16 14v4M10 18h4"/>`;
const OTTOMAN_IC  = `<ellipse cx="12" cy="14" rx="9" ry="4"/><path d="M3 14v2a9 4 0 0 0 18 0v-2"/>`;
const LOVESEAT_IC = `<path d="M4 15a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3H4z"/><path d="M6 14v-3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/><path d="M4 18h16"/>`;
const COFFEE_IC   = `<rect x="4" y="10" width="16" height="6" rx="1"/><path d="M6 10V7M18 10V7M9 10V8M15 10V8"/><path d="M4 16h16"/>`;
const DINING_IC   = `<rect x="2" y="8" width="20" height="8" rx="1"/><line x1="6" y1="8" x2="6" y2="20"/><line x1="18" y1="8" x2="18" y2="20"/>`;
const SIDE_IC     = `<rect x="6" y="10" width="12" height="8" rx="1"/><line x1="8" y1="10" x2="8" y2="6"/><line x1="16" y1="10" x2="16" y2="6"/><line x1="6" y1="18" x2="4" y2="22"/><line x1="18" y1="18" x2="20" y2="22"/>`;
const QUEEN_IC    = `<path d="M3 18V10a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8"/><path d="M3 18h18"/><path d="M5 10V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M13 10V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>`;
const KING_IC     = `<path d="M2 18V9a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v9"/><line x1="2" y1="18" x2="22" y2="18"/><path d="M6 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M13 9V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/>`;

const SELECT_IC  = `<path d="M4 4l7.07 17 2.51-7.42L21 11.07z"/>`;
const PAN_IC     = `<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 9.5V6a2 2 0 0 0-4 0v8l-1.7-3.4a2 2 0 0 0-3.3 2.2l3.6 5.8A6 6 0 0 0 10 22h2a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0"/>`;
const WALL_IC    = `<rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="15" y1="15" x2="15" y2="21"/>`;
const DOOR_IC    = `<path d="M13 4H6a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M13 20V4l6 3v13"/><circle cx="16" cy="12" r="0.5" fill="currentColor"/>`;
const WINDOW_IC  = `<rect x="3" y="5" width="18" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/>`;
const MEASURE_IC = `<path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2"/>`;
const SEARCH_IC  = `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`;
const CHEVRON_R  = `<polyline points="9 18 15 12 9 6"/>`;
const CHEVRON_D  = `<polyline points="6 9 12 15 18 9"/>`;
const IMPORT_IC  = `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`;

function svg(paths: string, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

@Component({
  selector: 'dito-furniture-library',
  imports: [CommonModule, FormsModule, DecimalPipe],
  styles: [`
    :host { display: flex; flex-direction: column; width: 220px; flex-shrink: 0; }
    .panel { display: flex; flex-direction: column; width: 220px; height: 100%; overflow: hidden; border-right: 1px solid var(--border); background: var(--panel-bg); }
    .panel-header { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); padding: 12px 14px 6px; }

    /* search */
    .search-box { display: flex; align-items: center; gap: 6px; margin: 0 10px 8px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 7px; padding: 6px 10px; }
    .search-ic { width: 13px; height: 13px; color: var(--muted); flex-shrink: 0; }
    .search-ic svg { width: 100%; height: 100%; }
    .search-input { flex: 1; background: none; border: none; outline: none; color: var(--fg); font-size: 12px; }
    .search-input::placeholder { color: var(--muted); }

    /* scroll */
    .scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }

    /* category */
    .category { border-bottom: 1px solid var(--border); }
    .cat-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: none; border: none; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 130ms; text-align: left; }
    .cat-header:hover { background: rgba(255,255,255,0.03); color: var(--fg); }
    .cat-header.open { color: var(--fg); }
    .cat-icon { width: 15px; height: 15px; flex-shrink: 0; }
    .cat-icon svg { width: 100%; height: 100%; }
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
    .card-icon { width: 26px; height: 26px; color: var(--muted); }
    .card-icon svg { width: 100%; height: 100%; }
    .card-name { font-size: 10px; color: var(--muted); line-height: 1.3; }
    .card-price { font-size: 10px; font-weight: 600; color: #D4A017; }

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
  `],
  template: `
    <div class="panel">
      @if (state.viewMode() === '3d') {
        <div class="panel-header">FURNITURE LIBRARY</div>
        <div class="search-box">
          <span class="search-ic" [innerHTML]="svgIcon(SEARCH_IC)"></span>
          <input type="text" placeholder="Search items…" [(ngModel)]="searchQuery" class="search-input" />
        </div>
        <div class="scroll">
          @for (cat of filteredCategories(); track cat.id) {
            <div class="category">
              <button class="cat-header" (click)="toggleCat(cat)" [class.open]="cat.open()">
                <span class="cat-icon" [style.color]="cat.color" [innerHTML]="svgIcon(cat.svgPath)"></span>
                <span class="cat-label">{{ cat.label }}</span>
                <span class="cat-count">{{ cat.count }}</span>
                <span class="cat-chevron" [class.open]="cat.open()" [innerHTML]="svgIcon(cat.open() ? CHEVRON_D : CHEVRON_R)"></span>
              </button>
              @if (cat.open()) {
                <div class="item-grid">
                  @for (item of cat.items; track item.id) {
                    <div class="furniture-card" draggable="true"
                      (dragstart)="onDragStart($event, item)"
                      (click)="assetSelected.emit(toAsset(item))">
                      <span class="card-icon" [innerHTML]="svgIcon(item.svgPath)"></span>
                      <div class="card-name">{{ item.name }}</div>
                      <div class="card-price">₹{{ item.price | number }}</div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
        <button class="import-btn" [innerHTML]="svgIcon(IMPORT_IC) + ' Import custom model (.glb)'"></button>
      } @else {
        <div class="panel-header">DRAWING ELEMENTS</div>
        <div class="scroll">
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
export class FurnitureLibraryComponent {
  readonly state = inject(StudioStateService);
  readonly assetSelected = output<Asset>();
  searchQuery = '';

  readonly SEARCH_IC = SEARCH_IC;
  readonly CHEVRON_R = CHEVRON_R;
  readonly CHEVRON_D = CHEVRON_D;
  readonly IMPORT_IC = IMPORT_IC;

  svgIcon(paths: string) { return svg(paths); }

  readonly categories: FurnitureCategory[] = [
    { id: 'sofas', label: 'Sofas & Seating', count: 6, color: '#D4A017', svgPath: SOFA_IC, open: signal(true), items: [
      { id: 's1', name: '3-Seater Sofa',  price: 42000, svgPath: SOFA_IC     },
      { id: 's2', name: 'Accent Chair',   price: 18500, svgPath: CHAIR_IC    },
      { id: 's3', name: 'Loveseat',       price: 28000, svgPath: LOVESEAT_IC },
      { id: 's4', name: 'Ottoman',        price: 8200,  svgPath: OTTOMAN_IC  },
    ]},
    { id: 'tables', label: 'Tables', count: 6, color: '#10B981', svgPath: TABLE_IC, open: signal(false), items: [
      { id: 't1', name: 'Coffee Table', price: 12500, svgPath: COFFEE_IC },
      { id: 't2', name: 'Dining Table', price: 35000, svgPath: DINING_IC },
      { id: 't3', name: 'Side Table',   price: 6800,  svgPath: SIDE_IC   },
    ]},
    { id: 'beds', label: 'Beds', count: 5, color: '#3B82F6', svgPath: BED_IC, open: signal(false), items: [
      { id: 'b1', name: 'Queen Bed', price: 55000, svgPath: QUEEN_IC },
      { id: 'b2', name: 'King Bed',  price: 75000, svgPath: KING_IC  },
    ]},
    { id: 'storage', label: 'Storage', count: 7, color: '#EF4444', svgPath: WARDROBE_IC, open: signal(false), items: [
      { id: 'st1', name: 'Wardrobe',   price: 45000, svgPath: WARDROBE_IC },
      { id: 'st2', name: 'Bookshelf',  price: 18000, svgPath: SHELF_IC    },
    ]},
    { id: 'lighting', label: 'Lighting', count: 9, color: '#8B5CF6', svgPath: LAMP_IC, open: signal(false), items: [
      { id: 'l1', name: 'Floor Lamp',    price: 8500,  svgPath: LAMP_IC  },
      { id: 'l2', name: 'Pendant Light', price: 12000, svgPath: PEND_IC  },
    ]},
  ];

  readonly draw2dItems: Draw2DItem[] = [
    { tool: 'select',  label: 'Select',    svgPath: SELECT_IC,  desc: 'Select & move elements'      },
    { tool: 'pan',     label: 'Pan',       svgPath: PAN_IC,     desc: 'Pan the canvas'              },
    { tool: 'wall',    label: 'Draw Wall', svgPath: WALL_IC,    desc: 'Click to place wall segments' },
    { tool: 'door',    label: 'Door',      svgPath: DOOR_IC,    desc: 'Place door openings'         },
    { tool: 'window',  label: 'Window',    svgPath: WINDOW_IC,  desc: 'Place window openings'       },
    { tool: 'measure', label: 'Measure',   svgPath: MEASURE_IC, desc: 'Measure distances'           },
  ];

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.categories;
    return this.categories
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(q)) }))
      .filter(cat => cat.label.toLowerCase().includes(q) || cat.items.length > 0);
  });

  toggleCat(cat: FurnitureCategory): void {
    const wasOpen = cat.open();
    this.categories.forEach(c => c.open.set(false));
    if (!wasOpen) cat.open.set(true);
  }

  onDragStart(event: DragEvent, item: FurnitureItem): void {
    event.dataTransfer?.setData('application/dito-asset', JSON.stringify(this.toAsset(item)));
  }

  toAsset(item: FurnitureItem): Asset {
    return {
      id: item.id, name: item.name, category: 'SOFA' as any,
      glbUrl: '', metadata: {}, tags: [],
      isPublic: false, createdAt: '', updatedAt: '',
    } as unknown as Asset;
  }
}
