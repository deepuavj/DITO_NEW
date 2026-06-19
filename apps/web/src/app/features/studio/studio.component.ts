import { Component, inject, OnInit, OnDestroy, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StudioStateService } from './services/studio-state.service';
import { HistoryService } from './services/history.service';
import { FloorPlanService } from './services/floor-plan.service';
import { StudioCanvasComponent } from './components/canvas/studio-canvas.component';
import { FurnitureLibraryComponent } from './components/assets-panel/assets-panel.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { StudioToolbarComponent } from './components/toolbar/studio-toolbar.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { SceneEngine } from '../../engines/scene/scene.engine';
import { MetadataEngine } from '../../engines/metadata/metadata.engine';
import { SceneService } from '../../core/services/scene.service';
import type { Asset } from '../../core/models/asset.models';
import type { Theme } from './services/studio-state.service';

@Component({
  selector: 'app-studio',
  imports: [
    CommonModule,
    StudioCanvasComponent,
    FurnitureLibraryComponent,
    PropertiesPanelComponent,
    StudioToolbarComponent,
    StatusBarComponent,
  ],
  providers: [StudioStateService, HistoryService],
  styles: [`
    .studio-root { display: flex; flex-direction: column; height: 100vh; overflow: hidden; outline: none; background: var(--canvas-bg); color: var(--fg); }
    .studio-root.dark {
      --canvas-bg: #080D1A; --panel-bg: rgba(14,20,35,0.96); --border: rgba(255,255,255,0.07);
      --muted: #7C8CA0; --fg: #E2E8F0; --input-bg: rgba(26,37,60,0.8);
      --grid-minor: rgba(255,255,255,0.05); --grid-major: rgba(255,255,255,0.1);
    }
    .studio-root.light {
      --canvas-bg: #F0F2F5; --panel-bg: rgba(255,255,255,0.96); --border: rgba(0,0,0,0.1);
      --muted: #6B7280; --fg: #1F2937; --input-bg: rgba(0,0,0,0.04);
      --grid-minor: rgba(0,0,0,0.07); --grid-major: rgba(0,0,0,0.14);
    }
    .studio-body { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .canvas-area { flex: 1; position: relative; overflow: hidden; min-width: 0; }
    .panel-toggle { position: absolute; top: 50%; transform: translateY(-50%); width: 20px; height: 48px; background: var(--panel-bg); border: 1px solid var(--border); color: var(--muted); font-size: 10px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 200ms; z-index: 10; }
    .panel-toggle:hover { color: var(--fg); background: rgba(37,99,235,0.3); }
    .left-toggle { left: 4px; border-radius: 0 4px 4px 0; }
    .right-toggle { right: 4px; border-radius: 4px 0 0 4px; }
  `],
  template: `
    <div class="studio-root" [class.dark]="state.theme()==='dark'" [class.light]="state.theme()==='light'" (keydown)="onKeyDown($event)" tabindex="0">
      @if (state.topPanelVisible()) {
        <dito-studio-toolbar (saveClicked)="onSave()" (renderClicked)="onRender()" />
      }
      <div class="studio-body">
        @if (state.leftPanelVisible()) {
          <dito-furniture-library (assetSelected)="onAssetDrop($event)" />
        }
        <div class="canvas-area" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <dito-studio-canvas />
          <button class="panel-toggle left-toggle" (click)="state.togglePanel('left')">{{ state.leftPanelVisible() ? '<' : '>' }}</button>
          <button class="panel-toggle right-toggle" (click)="state.togglePanel('right')">{{ state.rightPanelVisible() ? '>' : '<' }}</button>
        </div>
        @if (state.rightPanelVisible()) {
          <dito-properties-panel />
        }
      </div>
      <dito-status-bar (saveClicked)="onSave()" (renderClicked)="onRender()" />
    </div>
  `,
})
export class StudioComponent implements OnInit, OnDestroy {
  readonly id = input<string>();
  readonly state = inject(StudioStateService);
  private readonly history = inject(HistoryService);
  private readonly floorPlan = inject(FloorPlanService);
  private readonly sceneEngine = inject(SceneEngine);
  private readonly metadataEngine = inject(MetadataEngine);
  private readonly sceneService = inject(SceneService);
  private readonly router = inject(Router);
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    // Restore persisted theme
    const saved = localStorage.getItem('dito-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') this.state.theme.set(saved);

    // Persist theme changes
    effect(() => { localStorage.setItem('dito-theme', this.state.theme()); });

    const sceneId = this.id();
    if (sceneId) this.loadScene(sceneId);
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  onKeyDown(event: KeyboardEvent): void {
    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.shiftKey && event.key === 'z') {
      event.preventDefault();
      if (this.state.viewMode() === '2d') { this.floorPlan.redo(); this.history.redo(); }
      else this.history.redo();
    } else if (ctrl && event.key === 'z') {
      event.preventDefault();
      if (this.state.viewMode() === '2d') { this.floorPlan.undo(); this.history.undo(); }
      else this.history.undo();
    } else if (ctrl && event.key === 's') {
      event.preventDefault(); this.onSave();
    }
  }

  onAssetDrop(asset: Asset): void {
    this.metadataEngine.register(asset.id, asset.metadata);
    this.sceneEngine.addObject(asset.id, asset.name, [0, 0, 0]);
    this.history.push(`Added ${asset.name}`);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const raw = event.dataTransfer?.getData('application/dito-asset');
    if (!raw) return;
    try { this.onAssetDrop(JSON.parse(raw)); } catch {}
  }

  onSave(): void {
    const sceneId = this.id();
    if (!sceneId) return;
    this.state.isSaving.set(true);
    this.sceneService.save(sceneId, this.sceneEngine.serialize())
      .subscribe({
        error: () => { this.state.isSaving.set(false); },
        complete: () => {
          this.state.isSaving.set(false);
          this.state.savedToast.set(true);
          if (this.toastTimer) clearTimeout(this.toastTimer);
          this.toastTimer = setTimeout(() => this.state.savedToast.set(false), 2500);
        },
      });
  }

  onRender(): void { console.log('[DITO] Render requested'); }

  private loadScene(id: string): void {
    this.sceneService.getById(id).subscribe({
      next: scene => this.sceneEngine.loadSceneData(scene.sceneData),
      error: () => this.router.navigate(['/dashboard']),
    });
  }
}
