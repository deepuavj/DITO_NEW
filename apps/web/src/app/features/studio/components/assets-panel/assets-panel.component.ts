import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';
import type { Asset } from '../../../../core/models/asset.models';
import type { DrawTool } from '../../services/studio-state.service';

interface FurnitureItem { id: string; name: string; price: number; icon: string; }
interface FurnitureCategory {
  id: string; label: string; count: number;
  open: ReturnType<typeof signal<boolean>>; items: FurnitureItem[];
}
interface Draw2DItem { tool: DrawTool; label: string; icon: string; desc: string; }

@Component({
  selector: 'dito-furniture-library',
  imports: [CommonModule, FormsModule, DecimalPipe],
  styles: [`
    :host { display: flex; flex-direction: column; width: 220px; flex-shrink: 0; }
    .panel { display: flex; flex-direction: column; width: 220px; height: 100%; overflow: hidden; border-right: 1px solid var(--border); background: var(--panel-bg); }
    .panel-header { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--muted); padding: 12px 14px 6px; }
    .search-box { display: flex; align-items: center; margin: 0 10px 8px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; padding: 7px 10px; }
    .search-input { flex: 1; background: none; border: none; outline: none; color: var(--fg); font-size: 12px; }
    .search-input::placeholder { color: var(--muted); }
    .scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
    /* furniture */
    .category { border-bottom: 1px solid var(--border); }
    .cat-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; background: none; border: none; color: var(--muted); font-size: 12px; cursor: pointer; transition: all 150ms; text-align: left; }
    .cat-header:hover { background: rgba(255,255,255,0.03); color: var(--fg); }
    .cat-header.open { color: var(--fg); }
    .cat-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
    .cat-label { flex: 1; font-weight: 500; }
    .cat-count { font-size: 10px; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 8px; }
    .item-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px 8px 8px; }
    .furniture-card { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 10px 6px 8px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 150ms; text-align: center; }
    .furniture-card:hover { border-color: rgba(37,99,235,0.5); background: rgba(37,99,235,0.1); transform: translateY(-1px); }
    .card-icon { font-size: 22px; line-height: 1; }
    .card-name { font-size: 10px; color: var(--muted); line-height: 1.2; }
    .card-price { font-size: 10px; font-weight: 600; color: #D4A017; }
    /* 2D drawing tools */
    .draw-section { padding: 8px 10px 4px; }
    .draw-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; }
    .draw-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; transition: all 150ms; margin-bottom: 3px; }
    .draw-item:hover { background: rgba(255,255,255,0.04); border-color: var(--border); }
    .draw-item.active { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.4); }
    .draw-icon { font-size: 18px; width: 28px; text-align: center; }
    .draw-info { flex: 1; }
    .draw-name { font-size: 12px; font-weight: 600; color: var(--fg); }
    .draw-desc { font-size: 10px; color: var(--muted); }
    /* snapping */
    .snap-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px 10px 8px; }
    .snap-btn { padding: 6px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-size: 10px; cursor: pointer; transition: all 150ms; text-align: center; }
    .snap-btn.on { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    /* import */
    .import-btn { margin: 8px 10px; padding: 10px; background: var(--input-bg); border: 1px dashed var(--border); border-radius: 8px; color: var(--muted); font-size: 11px; cursor: pointer; transition: all 150ms; text-align: center; }
    .import-btn:hover { border-color: rgba(37,99,235,0.4); color: #60A5FA; }
  `],
  template: `
    <div class="panel">
      @if (state.viewMode() === '3d') {
        <div class="panel-header">FURNITURE LIBRARY</div>
        <div class="search-box">
          <input type="text" placeholder="Search items..." [(ngModel)]="searchQuery" class="search-input" />
        </div>
        <div class="scroll">
          @for (cat of filteredCategories(); track cat.id) {
            <div class="category">
              <button class="cat-header" (click)="toggleCat(cat)" [class.open]="cat.open()">
                <span class="cat-dot" [style.background]="catColors[cat.id]"></span>
                <span class="cat-label">{{ cat.label }}</span>
                <span class="cat-count">{{ cat.count }}</span>
                <span>{{ cat.open() ? '▾' : '▸' }}</span>
              </button>
              @if (cat.open()) {
                <div class="item-grid">
                  @for (item of cat.items; track item.id) {
                    <div class="furniture-card" draggable="true"
                      (dragstart)="onDragStart($event, item)"
                      (click)="assetSelected.emit(toAsset(item))">
                      <div class="card-icon">{{ item.icon }}</div>
                      <div class="card-name">{{ item.name }}</div>
                      <div class="card-price">₹{{ item.price | number }}</div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>
        <button class="import-btn">📁 Import custom model (.glb)</button>
      } @else {
        <div class="panel-header">DRAWING ELEMENTS</div>
        <div class="scroll">
          <div class="draw-section">
            <div class="draw-label">TOOLS</div>
            @for (item of draw2dItems; track item.tool) {
              <div class="draw-item" [class.active]="state.drawTool()===item.tool" (click)="state.setDrawTool(item.tool)">
                <span class="draw-icon">{{ item.icon }}</span>
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
          <div class="snap-grid">
            <button class="snap-btn" [class.on]="state.snapGrid()" (click)="state.toggleSnap('grid')">Grid</button>
            <button class="snap-btn" [class.on]="state.snapWall()" (click)="state.toggleSnap('wall')">Wall</button>
            <button class="snap-btn" [class.on]="state.snapAngle()" (click)="state.toggleSnap('angle')">Angle</button>
            <button class="snap-btn" [class.on]="state.snapCenter()" (click)="state.toggleSnap('center')">Center</button>
            <button class="snap-btn" [class.on]="state.snapEdge()" (click)="state.toggleSnap('edge')">Edge</button>
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

  readonly catColors: Record<string, string> = {
    sofas: '#D4A017', tables: '#10B981', beds: '#3B82F6', storage: '#EF4444', lighting: '#8B5CF6',
  };

  readonly categories: FurnitureCategory[] = [
    { id: 'sofas', label: 'Sofas & seating', count: 8, open: signal(true), items: [
      { id: 's1', name: '3-Seater sofa', price: 42000, icon: '🛋' },
      { id: 's2', name: 'Accent chair', price: 18500, icon: '🪑' },
      { id: 's3', name: 'Loveseat', price: 28000, icon: '🛋' },
      { id: 's4', name: 'Ottoman', price: 8200, icon: '🪑' },
    ]},
    { id: 'tables', label: 'Tables', count: 6, open: signal(false), items: [
      { id: 't1', name: 'Coffee table', price: 12500, icon: '🪞' },
      { id: 't2', name: 'Dining table', price: 35000, icon: '🪞' },
      { id: 't3', name: 'Side table', price: 6800, icon: '🪞' },
    ]},
    { id: 'beds', label: 'Beds', count: 5, open: signal(false), items: [
      { id: 'b1', name: 'Queen bed', price: 55000, icon: '🛏' },
      { id: 'b2', name: 'King bed', price: 75000, icon: '🛏' },
    ]},
    { id: 'storage', label: 'Storage', count: 7, open: signal(false), items: [
      { id: 'st1', name: 'Wardrobe', price: 45000, icon: '🗄' },
      { id: 'st2', name: 'Bookshelf', price: 18000, icon: '📚' },
    ]},
    { id: 'lighting', label: 'Lighting', count: 9, open: signal(false), items: [
      { id: 'l1', name: 'Floor lamp', price: 8500, icon: '💡' },
      { id: 'l2', name: 'Pendant light', price: 12000, icon: '💡' },
    ]},
  ];

  readonly draw2dItems: Draw2DItem[] = [
    { tool: 'select', label: 'Select', icon: '↖', desc: 'Select & move elements' },
    { tool: 'pan', label: 'Pan', icon: '✋', desc: 'Pan the canvas' },
    { tool: 'wall', label: 'Draw wall', icon: '▬', desc: 'Click to place wall segments' },
    { tool: 'door', label: 'Door', icon: '🚪', desc: 'Place door openings' },
    { tool: 'window', label: 'Window', icon: '⬜', desc: 'Place window openings' },
    { tool: 'measure', label: 'Measure', icon: '📏', desc: 'Measure distances' },
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
      thumbnailUrl: undefined, glbUrl: '', metadata: {}, tags: [],
      isPublic: false, createdAt: '', updatedAt: '', price: item.price,
    } as unknown as Asset;
  }
}
