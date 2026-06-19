import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import type { FloorMaterial } from '../../services/studio-state.service';

@Component({
  selector: 'dito-properties-panel',
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  styles: [`
    :host { display: flex; width: 280px; flex-shrink: 0; }
    .props-root { display: flex; flex-direction: column; width: 280px; height: 100%; background: rgba(14,20,35,0.96); border-left: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
    .selection-tabs { display: flex; gap: 4px; padding: 10px 10px 0; flex-wrap: wrap; }
    .sel-tab { flex: 1; padding: 6px 4px; background: rgba(26,37,60,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; color: #4A5568; font-size: 10px; cursor: pointer; transition: all 150ms; text-align: center; white-space: nowrap; min-width: 0; }
    .sel-tab.active-none { background: rgba(212,160,23,0.15); border-color: rgba(212,160,23,0.3); color: #D4A017; }
    .sel-tab.active-furniture { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.3); color: #60A5FA; }
    .sel-tab.active-room { background: rgba(20,184,166,0.15); border-color: rgba(20,184,166,0.3); color: #2DD4BF; }
    .tab-bar { display: flex; margin: 8px 10px 0; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 3px; }
    .tab-btn { flex: 1; padding: 7px 4px; background: none; border: none; border-radius: 8px; color: #7C8CA0; font-size: 12px; cursor: pointer; transition: all 150ms; text-align: center; }
    .tab-btn.active { background: rgba(255,255,255,0.08); color: #E2E8F0; font-weight: 600; }
    .tab-content { flex: 1; overflow-y: auto; padding: 10px; scrollbar-width: thin; scrollbar-color: #1E2D45 transparent; }
    .section-label { font-size: 10px; font-weight: 600; color: #4A5568; letter-spacing: 0.08em; margin: 10px 0 6px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; }
    .summary-card { background: #1A2540; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 12px; }
    .summary-card.wide { grid-column: span 2; }
    .sum-label { font-size: 10px; color: #7C8CA0; margin-bottom: 4px; }
    .sum-val { font-size: 20px; font-weight: 700; color: #E2E8F0; }
    .sum-val.small { font-size: 14px; }
    .sum-val.accent { color: #D4A017; }
    .placed-item { display: flex; align-items: center; gap: 8px; padding: 8px; background: #1A2540; border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; margin-bottom: 4px; cursor: pointer; transition: all 150ms; font-size: 12px; }
    .placed-item:hover { border-color: rgba(37,99,235,0.3); }
    .item-icon { font-size: 18px; }
    .item-name { flex: 1; color: #E2E8F0; }
    .item-price { color: #D4A017; font-weight: 600; }
    .history-item { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 6px; font-size: 11px; margin-bottom: 2px; color: #9CA3B0; }
    .history-item.undone { color: #4A5568; text-decoration: line-through; }
    .h-dot { width: 6px; height: 6px; border-radius: 50%; background: #2563EB; flex-shrink: 0; }
    .history-item.undone .h-dot { background: #2D3748; }
    .h-label { flex: 1; }
    .h-time { font-size: 10px; color: #4A5568; }
    .empty-state { text-align: center; color: #4A5568; font-size: 12px; padding: 24px; }
    .color-swatches { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
    .swatch-sm { width: 28px; height: 28px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; transition: all 150ms; }
    .swatch-sm:hover, .swatch-sm.sel { border-color: #2563EB; transform: scale(1.1); }
    .hex-input { width: 100%; background: #1A2540; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 7px 10px; color: #E2E8F0; font-size: 12px; margin-bottom: 4px; outline: none; font-family: monospace; box-sizing: border-box; }
    .material-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .mat-pill { padding: 6px 12px; background: #1A2540; border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; color: #9CA3B0; font-size: 11px; cursor: pointer; }
    .slider-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
    .s-label { font-size: 11px; color: #7C8CA0; min-width: 70px; }
    .slider { flex: 1; height: 4px; appearance: none; background: #1E2D45; border-radius: 2px; outline: none; }
    .slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: #D4A017; border-radius: 50%; cursor: pointer; }
    .s-val { font-size: 11px; color: #D4A017; min-width: 32px; text-align: right; }
    .dims-row { display: flex; gap: 6px; margin-bottom: 12px; }
    .dims-row span { flex: 1; text-align: center; background: #1A2540; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 7px 4px; font-size: 11px; color: #7C8CA0; }
    .action-footer { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    .action-footer-btn { width: 100%; padding: 9px; background: #1A2540; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #9CA3B0; font-size: 12px; cursor: pointer; transition: all 150ms; text-align: center; }
    .action-footer-btn.danger:hover { background: rgba(239,68,68,0.15); color: #FCA5A5; }
    .action-footer-btn.accent { background: rgba(37,99,235,0.15); border-color: rgba(37,99,235,0.3); color: #60A5FA; }
    .transform-group { margin-bottom: 6px; }
    .transform-label { font-size: 9px; font-weight: 600; color: #4A5568; letter-spacing: 0.08em; margin-bottom: 3px; }
    .num-input { width: 100%; background: #1A2540; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 7px 10px; color: #E2E8F0; font-size: 12px; outline: none; font-family: monospace; box-sizing: border-box; }
    .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 10px 0; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
    .t-label { font-size: 12px; color: #7C8CA0; }
    .toggle-switch { width: 36px; height: 20px; background: #2D3748; border: none; border-radius: 10px; position: relative; cursor: pointer; }
    .toggle-switch .thumb { position: absolute; width: 14px; height: 14px; background: white; border-radius: 50%; top: 3px; left: 3px; }
    .dim-input-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .dim-label { font-size: 11px; color: #7C8CA0; width: 50px; }
    .floor-pills { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
    .floor-pill { padding: 6px 12px; background: #1A2540; border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; color: #9CA3B0; font-size: 11px; cursor: pointer; }
    .floor-pill.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.4); color: #60A5FA; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; }
    .stat-item { background: #1A2540; border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 10px; }
    .stat-label { font-size: 9px; color: #4A5568; margin-bottom: 3px; }
    .stat-val { font-size: 14px; font-weight: 600; color: #E2E8F0; }
    .ai-arrange-btn { width: 100%; padding: 10px; background: linear-gradient(135deg, rgba(37,99,235,0.2), rgba(20,184,166,0.2)); border: 1px solid rgba(37,99,235,0.3); border-radius: 10px; color: #60A5FA; font-size: 12px; font-weight: 600; cursor: pointer; }
  `],
  template: `
    <div class="props-root">
      <div class="selection-tabs">
        <button class="sel-tab" [class.active-none]="state.selectionState()==='none'" (click)="state.setSelectionState('none')">Nothing</button>
        <button class="sel-tab" [class.active-furniture]="state.selectionState()==='furniture'" (click)="state.setSelectionState('furniture')">Furniture</button>
        <button class="sel-tab" [class.active-room]="state.selectionState()==='room'" (click)="state.setSelectionState('room')">Room</button>
      </div>
      <div class="tab-bar">
        @for (tab of activeTabs(); track tab) {
          <button class="tab-btn" [class.active]="activeTab()===tab" (click)="activeTab.set(tab)">{{ tab }}</button>
        }
      </div>
      <div class="tab-content">
        @if (state.selectionState()==='none' && activeTab()==='Overview') {
          <div class="summary-grid">
            <div class="summary-card"><div class="sum-label">Items</div><div class="sum-val">{{ state.itemCount() }}</div></div>
            <div class="summary-card"><div class="sum-label">Room</div><div class="sum-val small">{{ state.roomSize().width }}x{{ state.roomSize().depth }}m</div></div>
            <div class="summary-card wide"><div class="sum-label">Total</div><div class="sum-val accent">Rs.{{ totalFormatted() }}</div></div>
          </div>
          <div class="section-label">PLACED ITEMS</div>
          @for (item of placedItems; track item.id) {
            <div class="placed-item">
              <span class="item-icon">{{ item.icon }}</span>
              <span class="item-name">{{ item.name }}</span>
              <span class="item-price">Rs.{{ item.price | number }}</span>
            </div>
          }
        }
        @if (activeTab()==='History') {
          @for (entry of history.entries(); track entry.id) {
            <div class="history-item" [class.undone]="entry.undone">
              <span class="h-dot"></span>
              <span class="h-label">{{ entry.label }}</span>
              <span class="h-time">{{ entry.timestamp | date:'HH:mm' }}</span>
            </div>
          } @empty {
            <div class="empty-state">No history yet</div>
          }
        }
        @if (state.selectionState()==='furniture' && activeTab()==='Properties') {
          <div class="section-label">COLOUR</div>
          <div class="color-swatches">
            @for (c of furnitureColors; track c) { <button class="swatch-sm" [style.background]="c"></button> }
          </div>
          <input type="text" value="#2563EB" class="hex-input" placeholder="#hex" />
          <div class="section-label">MATERIAL</div>
          <div class="material-pills">
            @for (m of materials; track m) { <button class="mat-pill">{{ m }}</button> }
          </div>
          <div class="slider-row"><span class="s-label">Roughness</span><input type="range" class="slider" value="40"/><span class="s-val">40%</span></div>
          <div class="section-label">DIMENSIONS</div>
          <div class="dims-row"><span>W 2.4m</span><span>D 0.9m</span><span>H 0.85m</span></div>
          <div class="action-footer">
            <button class="action-footer-btn danger">Remove</button>
            <button class="action-footer-btn">Duplicate</button>
            <button class="action-footer-btn accent">Add to Cart</button>
          </div>
        }
        @if (state.selectionState()==='furniture' && activeTab()==='Transform') {
          @for (axis of ['X','Y','Z']; track axis) {
            <div class="transform-group">
              <div class="transform-label">POSITION {{ axis }}</div>
              <input type="number" class="num-input" value="0" step="0.1" />
            </div>
          }
          <div class="divider"></div>
          @for (axis of ['X','Y','Z']; track axis) {
            <div class="transform-group">
              <div class="transform-label">ROTATION {{ axis }}</div>
              <input type="number" class="num-input" value="0" step="1" />
            </div>
          }
          <div class="divider"></div>
          @for (axis of ['X','Y','Z']; track axis) {
            <div class="transform-group">
              <div class="transform-label">SCALE {{ axis }}</div>
              <input type="number" class="num-input" value="1" step="0.1" />
            </div>
          }
        }
        @if (state.selectionState()==='room' && activeTab()==='Room') {
          <div class="dim-input-row"><span class="dim-label">Length</span><input type="number" class="num-input" [value]="state.roomSize().width" /></div>
          <div class="dim-input-row"><span class="dim-label">Width</span><input type="number" class="num-input" [value]="state.roomSize().depth" /></div>
          <div class="dim-input-row"><span class="dim-label">Height</span><input type="number" class="num-input" [value]="state.roomSize().height" /></div>
          <div class="section-label">WALL COLOUR</div>
          <div class="color-swatches">
            @for (c of wallColors; track c) {
              <button class="swatch-sm" [style.background]="c" [class.sel]="state.wallColor()===c" (click)="state.wallColor.set(c)"></button>
            }
          </div>
          <div class="section-label">FLOOR TEXTURE</div>
          <div class="floor-pills">
            @for (f of floorMaterials; track f.id) {
              <button class="floor-pill" [class.active]="state.floorMaterial()===f.id" (click)="state.setFloorMaterial(f.id)">{{ f.label }}</button>
            }
          </div>
          <div class="stats-grid">
            <div class="stat-item"><div class="stat-label">Floor area</div><div class="stat-val">{{ floorArea() }} m2</div></div>
            <div class="stat-item"><div class="stat-label">Volume</div><div class="stat-val">{{ volume() }} m3</div></div>
          </div>
          <button class="ai-arrange-btn">AI auto-arrange</button>
        }
      </div>
    </div>
  `,
})
export class PropertiesPanelComponent {
  readonly state = inject(StudioStateService);
  readonly history = inject(HistoryService);
  readonly activeTab = signal('Overview');

  readonly activeTabs = computed(() => {
    switch (this.state.selectionState()) {
      case 'none': return ['Overview', 'History'];
      case 'furniture': return ['Properties', 'Transform', 'History'];
      case 'room': return ['Room', 'History'];
      default: return ['Overview', 'History'];
    }
  });

  readonly floorArea = computed(() => +(this.state.roomSize().width * this.state.roomSize().depth).toFixed(1));
  readonly volume = computed(() => +(this.state.roomSize().width * this.state.roomSize().depth * this.state.roomSize().height).toFixed(1));

  readonly wallColors = ['#F5F0E8', '#E8E0D0', '#D4C4A8', '#C8D0D8', '#B0B8C8', '#8C9BB0', '#4A5568', '#1A202C'];
  readonly floorMaterials: { id: FloorMaterial; label: string }[] = [
    { id: 'wood', label: 'Wood' }, { id: 'tile', label: 'Tile' },
    { id: 'marble', label: 'Marble' }, { id: 'concrete', label: 'Concrete' }
  ];
  readonly furnitureColors = ['#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#D97706', '#16A34A', '#0891B2', '#E2E8F0'];
  readonly materials = ['Fabric', 'Leather', 'Velvet', 'Wood', 'Metal'];
  readonly placedItems = [
    { id: 'p1', name: '3-Seater sofa', icon: '🛋', price: 42000 },
    { id: 'p2', name: 'Accent chair', icon: '🪑', price: 18500 },
    { id: 'p3', name: 'Coffee table', icon: '🪞', price: 12500 },
    { id: 'p4', name: 'Floor plant', icon: '🌿', price: 6200 },
  ];

  constructor() {
    effect(() => { this.activeTab.set(this.activeTabs()[0]); });
  }

  totalFormatted(): string {
    const t = this.placedItems.reduce((s, i) => s + i.price, 0);
    return t >= 1000 ? Math.round(t / 1000) + 'k' : String(t);
  }
}
