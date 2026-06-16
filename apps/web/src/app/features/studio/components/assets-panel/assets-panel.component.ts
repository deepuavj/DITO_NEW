import { Component, inject, signal, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetService } from '../../../../core/services/asset.service';
import type { Asset, AssetCategory } from '../../../../core/models/asset.models';

@Component({
  selector: 'dito-assets-panel',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-white border-r border-gray-200">
      <div class="p-3 border-b border-gray-100">
        <input
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch()"
          placeholder="Search assets..."
          class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div class="flex gap-1 p-2 border-b border-gray-100 flex-wrap">
        @for (cat of categories; track cat) {
          <button
            (click)="setCategory(cat)"
            [class.bg-indigo-600]="activeCategory() === cat"
            [class.text-white]="activeCategory() === cat"
            [class.bg-gray-100]="activeCategory() !== cat"
            class="px-2 py-1 text-xs rounded-md font-medium transition-colors"
          >{{ cat }}</button>
        }
      </div>

      <div class="flex-1 overflow-y-auto p-2">
        @if (loading()) {
          <div class="text-center py-8 text-gray-400 text-sm">Loading...</div>
        }
        <div class="grid grid-cols-2 gap-2">
          @for (asset of assets(); track asset.id) {
            <div
              class="cursor-grab rounded-lg border border-gray-100 overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all"
              draggable="true"
              (dragstart)="onDragStart($event, asset)"
              (click)="assetSelected.emit(asset)"
            >
              @if (asset.thumbnailUrl) {
                <img [src]="asset.thumbnailUrl" [alt]="asset.name" class="w-full h-20 object-cover" />
              } @else {
                <div class="w-full h-20 bg-gray-50 flex items-center justify-center text-gray-300">
                  <span class="text-3xl">🪑</span>
                </div>
              }
              <p class="text-xs p-1.5 text-gray-700 font-medium truncate">{{ asset.name }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AssetsPanelComponent implements OnInit {
  private readonly assetService = inject(AssetService);

  readonly assetSelected = output<Asset>();

  readonly assets = signal<Asset[]>([]);
  readonly loading = signal(false);
  readonly activeCategory = signal<AssetCategory | undefined>(undefined);

  searchQuery = '';

  readonly categories: AssetCategory[] = [
    'SOFA', 'CHAIR', 'TABLE', 'BED', 'STORAGE', 'LIGHTING', 'DECOR',
  ];

  ngOnInit(): void {
    this.loadAssets();
  }

  setCategory(cat: AssetCategory): void {
    const same = this.activeCategory() === cat;
    this.activeCategory.set(same ? undefined : cat);
    this.loadAssets();
  }

  onSearch(): void {
    this.loadAssets();
  }

  onDragStart(event: DragEvent, asset: Asset): void {
    event.dataTransfer?.setData('application/dito-asset', JSON.stringify(asset));
  }

  private loadAssets(): void {
    this.loading.set(true);
    this.assetService
      .list({ category: this.activeCategory(), search: this.searchQuery || undefined })
      .subscribe({
        next: res => {
          this.assets.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
