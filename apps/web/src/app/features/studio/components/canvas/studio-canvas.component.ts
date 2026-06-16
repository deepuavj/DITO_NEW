import {
  Component, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, inject, effect, HostListener, Injector,
} from '@angular/core';
import { RendererService } from '../../services/renderer.service';
import { SceneEngine } from '../../../../engines/scene/scene.engine';
import { StudioStateService } from '../../services/studio-state.service';

@Component({
  selector: 'dito-studio-canvas',
  providers: [RendererService],
  template: `
    <canvas
      #canvas
      class="w-full h-full block outline-none"
      (click)="onCanvasClick($event)"
      tabindex="0"
    ></canvas>
  `,
})
export class StudioCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly renderer = inject(RendererService);
  private readonly sceneEngine = inject(SceneEngine);
  private readonly state = inject(StudioStateService);
  private readonly injector = inject(Injector);
  private resizeObserver!: ResizeObserver;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.renderer.init(canvas);

    // React to scene changes and sync to Three.js
    effect(() => {
      this.sceneEngine.objects(); // track
      this.renderer.syncScene();
    }, { injector: this.injector });

    // React to selection changes for highlight
    effect(() => {
      const id = this.sceneEngine.selectedId();
      this.renderer.highlightObject(id);
    }, { injector: this.injector });

    this.resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      this.renderer.resize(width, height);
    });
    this.resizeObserver.observe(canvas.parentElement!);
  }

  onCanvasClick(event: MouseEvent): void {
    if (this.state.mode() !== 'select') return;
    const canvas = this.canvasRef.nativeElement;
    const id = this.renderer.pickObject(event, canvas);
    this.sceneEngine.select(id);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
    this.renderer.ngOnDestroy();
  }
}
