import {
  Component, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, inject, effect, Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendererService } from '../../services/renderer.service';
import { SceneEngine } from '../../../../engines/scene/scene.engine';
import { StudioStateService } from '../../services/studio-state.service';

@Component({
  selector: 'dito-studio-canvas',
  imports: [CommonModule],
  providers: [RendererService],
  styles: [`
    :host { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
    canvas { display: block; width: 100%; height: 100%; outline: none; }
    /* 2D grid canvas */
    .canvas-2d { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--canvas-bg, #F4F5F7); }
    .grid-svg { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
    .empty-hint { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; }
    .hint-icon { opacity: 0.15; }
    .hint-text { font-size: 13px; color: var(--muted, #9CA3AF); font-weight: 500; }
    .hint-sub { font-size: 11px; color: var(--muted, #9CA3AF); }
    /* drop zone pulse on dragover */
    .canvas-2d.dragover { background: rgba(37,99,235,0.04); }
  `],
  template: `
    @if (state.viewMode() === '3d') {
      <canvas
        #canvas
        (click)="onCanvasClick($event)"
        (dragover)="$event.preventDefault()"
        (drop)="onDrop($event)"
        tabindex="0"
      ></canvas>
    } @else {
      <div class="canvas-2d"
        [class.dragover]="dragging"
        (dragover)="dragging=true; $event.preventDefault()"
        (dragleave)="dragging=false"
        (drop)="dragging=false">
        <!-- grid -->
        <svg class="grid-svg" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--grid-minor,rgba(128,128,128,0.1))" stroke-width="0.5"/>
            </pattern>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#smallGrid)"/>
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="var(--grid-major,rgba(128,128,128,0.2))" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
        <!-- empty state -->
        <div class="empty-hint">
          <svg class="hint-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M3 9h18M9 21V9"/>
          </svg>
          <div class="hint-text">2D Floor Plan</div>
          <div class="hint-sub">Use the drawing tools on the left to add walls, doors and windows</div>
        </div>
      </div>
    }
  `,
})
export class StudioCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly state = inject(StudioStateService);
  private readonly renderer = inject(RendererService);
  private readonly sceneEngine = inject(SceneEngine);
  private readonly injector = inject(Injector);
  private resizeObserver!: ResizeObserver;
  dragging = false;

  ngAfterViewInit(): void {
    if (this.state.viewMode() === '3d') this.init3D();
  }

  private init3D(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    // Wait one frame so flex layout has settled and canvas has real dimensions
    requestAnimationFrame(() => {
      this.renderer.init(canvas);

      effect(() => {
        this.sceneEngine.objects();
        this.renderer.syncScene();
      }, { injector: this.injector });

      effect(() => {
        this.renderer.highlightObject(this.sceneEngine.selectedId());
      }, { injector: this.injector });

      this.resizeObserver = new ResizeObserver(entries => {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) this.renderer.resize(width, height);
      });
      this.resizeObserver.observe(canvas.parentElement!);
    });
  }

  onCanvasClick(event: MouseEvent): void {
    if (this.state.mode() !== 'select') return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const id = this.renderer.pickObject(event, canvas);
    this.sceneEngine.select(id);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    // drag-drop handled by parent studio component
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.state.viewMode() === '3d') this.renderer.ngOnDestroy();
  }
}
