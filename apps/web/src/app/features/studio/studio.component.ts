import { Component, inject, OnInit, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StudioStateService } from './services/studio-state.service';
import { StudioCanvasComponent } from './components/canvas/studio-canvas.component';
import { AssetsPanelComponent } from './components/assets-panel/assets-panel.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { StudioToolbarComponent } from './components/toolbar/studio-toolbar.component';
import { SceneEngine } from '../../engines/scene/scene.engine';
import { MetadataEngine } from '../../engines/metadata/metadata.engine';
import { SceneService } from '../../core/services/scene.service';
import type { Asset } from '../../core/models/asset.models';

@Component({
  selector: 'app-studio',
  imports: [
    CommonModule,
    StudioCanvasComponent,
    AssetsPanelComponent,
    PropertiesPanelComponent,
    StudioToolbarComponent,
  ],
  providers: [StudioStateService],
  template: `
    <div class="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <!-- Toolbar -->
      <dito-studio-toolbar
        (saveClicked)="onSave()"
        (renderClicked)="onRender()"
      />

      <!-- Main layout -->
      <div class="flex flex-1 min-h-0">
        <!-- Left: Asset Library -->
        <div class="w-56 flex-shrink-0">
          <dito-assets-panel (assetSelected)="onAssetDrop($event)" />
        </div>

        <!-- Centre: 3D Canvas -->
        <div
          class="flex-1 relative"
          (dragover)="$event.preventDefault()"
          (drop)="onDrop($event)"
        >
          <dito-studio-canvas />
        </div>

        <!-- Right: Properties -->
        @if (state.isPanelOpen()) {
          <div class="w-64 flex-shrink-0">
            <dito-properties-panel />
          </div>
        }
      </div>
    </div>
  `,
})
export class StudioComponent implements OnInit {
  readonly id = input<string>();

  readonly state = inject(StudioStateService);
  private readonly sceneEngine = inject(SceneEngine);
  private readonly metadataEngine = inject(MetadataEngine);
  private readonly sceneService = inject(SceneService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const sceneId = this.id();
    if (sceneId) this.loadScene(sceneId);
  }

  onAssetDrop(asset: Asset): void {
    this.metadataEngine.register(asset.id, asset.metadata);
    this.sceneEngine.addObject(asset.id, asset.name, [0, 0, 0]);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const raw = event.dataTransfer?.getData('application/dito-asset');
    if (!raw) return;
    try {
      const asset: Asset = JSON.parse(raw);
      this.onAssetDrop(asset);
    } catch {}
  }

  onSave(): void {
    const sceneId = this.id();
    if (!sceneId) return;
    this.state.isSaving.set(true);
    this.sceneService
      .save(sceneId, this.sceneEngine.serialize())
      .subscribe({ error: () => {}, complete: () => this.state.isSaving.set(false) });
  }

  onRender(): void {
    // Phase 4 feature
    console.log('[DITO] Render requested — Phase 4');
  }

  private loadScene(id: string): void {
    this.sceneService.getById(id).subscribe({
      next: scene => this.sceneEngine.loadSceneData(scene.sceneData),
      error: () => this.router.navigate(['/dashboard']),
    });
  }
}
