import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';
import type { Asset } from '../../../../core/models/asset.models';

interface FurnitureItem { id: string; name: string; price: number; icon: string; }
interface FurnitureCategory {
  id: string; label: string; icon: string; count: number;
  open: ReturnType<typeof signal<boolean>>; items: FurnitureItem[];
}

@Component({
  selector: 'dito-furniture-library',
  imports: [CommonModule, FormsModule, DecimalPipe],
  styles: [`
    :host { display: flex; flex-direction: column; width: 220px; flex-shrink: 0; }
    .library-root { display: flex; flex-direction: column; width: 220px; height: 100%; background: rgba(14,20,35,0.96); border-right: 1px solid rgba(255,255,255,0.07); overflow: hidden; }
    .lib-header { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: #4A5568; padding: 14px 14px 8px; }
    .search-box { display: flex; align-items: center; gap: 8px; margin: 0 10px 8px; background: #1A2540; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 8px 12px; }
    .search-input { flex: 1; background: none; border: none; outline: none; color: #E2E8F0; font-size: 13px; }
    .search-input::placeholder { color: #4A5568; }
    .room-selector { display: flex; align-items: center; gap: 8px; margin: 0 10px 6px; background: #1A2540; border: 1px solid rgba(212,160,23,0.2); border-radius: 10px; padding: 8px 10px; }
    .room-info { flex: 1; }
    .room-name { font-size: 12px; font-weight: 600; color: #E2E8F0; }
    .room-dims { font-size: 10px; color: #7C8CA0; }
    .drag-hint { font-size: 10px; color: #4A5568; text-align: center; padding: 4px 0 8px; }
    .categories { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: #1E2D45 transparent; }
    .category { border-bottom: 1px solid rgba(255,255,255,0.04); }
    .cat-header { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; background: none; border: none; color: #9CA3B0; font-size: 12px; cursor: pointer; transition: all 150ms; text-align: left; }
    .cat-header:hover { background: rgba(255,255,255,0.03); color: #E2E8F0; }
    .cat-header.open { background: rgba(37,99,235,0.08); color: #E2E8F0; }
    .cat-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .cat-label { flex: 1; font-weight: 500; }
    .cat-count { font-size: 10px; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 10px; }
    .item-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 6px 8px 8px; }
    .furniture-card { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 6px 8px; background: #1A2540; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; cursor: pointer; transition: all 150ms; text-align: center; }
    .furniture-card:hover { border-color: rgba(37,99,235,0.4); background: rgba(37,99,235,0.1); transform: translateY(-1px); }
    .card-icon { font-size: 24px; line-height: 1; }
    .card-name { font-size: 10px; color: #9CA3B0; line-height: 1.3; }
    .card-price { font-size: 11px; font-weight: 600; color: #D4A017; }
    .import-btn { margin: 8px 10px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.12); border-radius: 10px; color: #7C8CA0; font-size: 12px; cursor: pointer; transition: all 150ms; text-align: center; }
    .import-btn:hover { border-color: rgba(37,99,235,0.4); color: #60A5FA; }
  `],
  template: `
    <div class="library-root">
      <div class="lib-header">FURNITURE LIBRARY</div>
      <div class="search-box">
        <input type="text" placeholder="Search items..." [(ngModel)]="searchQuery" class="search-input" />
      </div>
      <div class="room-selector">
        <div class="room-info">
          <div class="room-name">Living Room</div>
          <div class="room-dims">{{ state.roomSize().width }}m × {{ state.roomSize().depth }}m</div>
        </div>
      </div>
      <div class="drag-hint">drag items to canvas</div>
      <div class="categories">
        @for (cat of filteredCategories(); track cat.id) {
          <div class="category">
            <button class="cat-header" (click)="toggleCategory(cat)" [class.open]="cat.open()">
              <span class="cat-dot" [style.background]="catColors[cat.id]"></span>
              <span class="cat-label">{{ cat.label }}</span>
              <span class="cat-count">{{ cat.count }}</span>
              <span>{{ cat.open() ? '▼' : '▶' }}</span>
            </button>
            @if (cat.open()) {
              <div class="item-grid">
                @for (item of cat.items; track item.id) {
                  <div class="furniture-card" draggable="true" (dragstart)="onDragStart($event, item)" (click)="assetSelected.emit(toAsset(item))">
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
    </div>
  `,
})
export class FurnitureLibraryComponent {
  readonly state = inject(StudioStateService);
  readonly assetSelected = output<Asset>();
  searchQuery = '';

  readonly catColors: Record<string, string> = {
    sofas: '#D4A017', tables: '#10B981', beds: '#3B82F6', storage: '#EF4444', lighting: '#8B5CF6'
  };

  readonly categories: FurnitureCategory[] = [
    { id: 'sofas', label: 'Sofas & seating', icon: '🟡', count: 8, open: signal(true), items: [
      { id: 's1', name: '3-Seater sofa', price: 42000, icon: '🛋' },
      { id: 's2', name: 'Accent chair', price: 18500, icon: '🪑' },
      { id: 's3', name: 'Loveseat', price: 28000, icon: '🛋' },
      { id: 's4', name: 'Ottoman', price: 8200, icon: '🪑' },
    ]},
    { id: 'tables', label: 'Tables', icon: '🟢', count: 6, open: signal(false), items: [
      { id: 't1', name: 'Coffee table', price: 12500, icon: '🪞' },
      { id: 't2', name: 'Dining table', price: 35000, icon: '🪞' },
      { id: 't3', name: 'Side table', price: 6800, icon: '🪞' },
    ]},
    { id: 'beds', label: 'Beds', icon: '🔵', count: 5, open: signal(false), items: [
      { id: 'b1', name: 'Queen bed', price: 55000, icon: '🛏' },
      { id: 'b2', name: 'King bed', price: 75000, icon: '🛏' },
    ]},
    { id: 'storage', label: 'Storage', icon: '🔴', count: 7, open: signal(false), items: [
      { id: 'st1', name: 'Wardrobe', price: 45000, icon: '🗄' },
      { id: 'st2', name: 'Bookshelf', price: 18000, icon: '📚' },
    ]},
    { id: 'lighting', label: 'Lighting', icon: '🟣', count: 9, open: signal(false), items: [
      { id: 'l1', name: 'Floor lamp', price: 8500, icon: '💡' },
      { id: 'l2', name: 'Pendant light', price: 12000, icon: '💡' },
    ]},
  ];

  readonly filteredCategories = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.categories;
    return this.categories
      .map(cat => ({ ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(q)) }))
      .filter(cat => cat.label.toLowerCase().includes(q) || cat.items.length > 0);
  });

  toggleCategory(cat: FurnitureCategory): void {
    const wasOpen = cat.open();
    this.categories.forEach(c => c.open.set(false));
    if (!wasOpen) cat.open.set(true);
  }

  onDragStart(event: DragEvent, item: FurnitureItem): void {
    event.dataTransfer?.setData('application/dito-asset', JSON.stringify(this.toAsset(item)));
  }

  toAsset(item: FurnitureItem): Asset {
    return { id: item.id, name: item.name, category: 'SOFA' as any, thumbnailUrl: null, modelUrl: '', metadata: {}, price: item.price } as unknown as Asset;
  }
}
