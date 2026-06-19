import {
  Component, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, inject, effect, Injector, signal, computed,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RendererService } from '../../services/renderer.service';
import { SceneEngine } from '../../../../engines/scene/scene.engine';
import { StudioStateService } from '../../services/studio-state.service';

// ─── Data model ───────────────────────────────────────────────────────────────
interface Pt { x: number; y: number }
interface Wall { id: string; start: Pt; end: Pt }
interface Door2D { id: string; cx: Pt; angle: number }
interface Win2D { id: string; cx: Pt; angle: number }
interface Measure { id: string; start: Pt; end: Pt }

@Component({
  selector: 'dito-studio-canvas',
  imports: [CommonModule, DecimalPipe],
  providers: [RendererService],
  styles: [`
    :host { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; }
    canvas { display: block; width: 100%; height: 100%; outline: none; }
    .canvas-2d { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--canvas-bg, #F4F5F7); }
    .grid-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .empty-hint { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; pointer-events: none; }
    .hint-icon { opacity: 0.15; }
    .hint-text { font-size: 13px; color: var(--muted, #9CA3AF); font-weight: 500; }
    .hint-sub { font-size: 11px; color: var(--muted, #9CA3AF); }
    .canvas-2d.dragover { background: rgba(37,99,235,0.04); }
    /* 2D canvas */
    .canvas-2d-svg { display: block; width: 100%; height: 100%; cursor: crosshair; user-select: none; }
    .zoom-controls { position: absolute; bottom: 12px; right: 12px; display: flex; align-items: center; gap: 4px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; z-index: 10; }
    .zoom-btn { width: 24px; height: 24px; border: none; background: none; color: var(--fg); font-size: 16px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .zoom-btn:hover { background: rgba(255,255,255,0.08); }
    .zoom-pct { font-size: 11px; color: var(--muted); min-width: 36px; text-align: center; font-weight: 600; }
    .upload-btn { position: absolute; top: 12px; right: 12px; display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 7px; color: var(--muted); font-size: 11px; cursor: pointer; z-index: 10; transition: all 150ms; }
    .upload-btn:hover { color: var(--fg); border-color: rgba(59,130,246,0.4); }
    .dxf-banner { position: absolute; top: 50px; left: 50%; transform: translateX(-50%); background: rgba(234,88,12,0.9); color: white; padding: 8px 16px; border-radius: 6px; font-size: 12px; z-index: 20; }
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

        <!-- DXF/DWG upload banner -->
        @if (dwgBanner) {
          <div class="dxf-banner">{{ dwgBanner }}</div>
        }

        <!-- Upload button -->
        <button class="upload-btn" (click)="dwgInput.click()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Upload Floor Plan
        </button>
        <input #dwgInput type="file" accept=".dxf,.dwg" style="display:none" (change)="onFileUpload($event)"/>

        <!-- Main interactive SVG -->
        <svg #svg2d class="canvas-2d-svg"
          xmlns="http://www.w3.org/2000/svg"
          (mousedown)="onDown($event)"
          (mousemove)="onMove($event)"
          (mouseup)="onUp($event)"
          (mouseleave)="onLeave()"
          (wheel)="onWheel($event)"
          [style.cursor]="svgCursor()">

          <defs>
            <!-- minor grid: every 60px -->
            <pattern id="minorGrid" width="60" height="60" patternUnits="userSpaceOnUse"
              [attr.patternTransform]="patternTransform()">
              <path d="M 60 0 L 0 0 0 60" fill="none"
                stroke="var(--grid-minor,rgba(128,128,128,0.12))" stroke-width="0.5"/>
            </pattern>
            <!-- major grid: every 300px (5 cells = 2.5 m) -->
            <pattern id="majorGrid" width="300" height="300" patternUnits="userSpaceOnUse"
              [attr.patternTransform]="patternTransform()">
              <rect width="300" height="300" fill="url(#minorGrid)"/>
              <path d="M 300 0 L 0 0 0 300" fill="none"
                stroke="var(--grid-major,rgba(128,128,128,0.22))" stroke-width="1"/>
            </pattern>
            <!-- arrow marker for measures -->
            <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--fg,#374151)"/>
            </marker>
            <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--fg,#374151)"/>
            </marker>
          </defs>

          <!-- grid background -->
          <rect width="100%" height="100%" fill="url(#majorGrid)"/>

          <!-- all drawing elements inside the viewport transform group -->
          <g [attr.transform]="viewTransform()">

            <!-- Walls -->
            @for (w of walls; track w.id) {
              <line
                [attr.x1]="w.start.x" [attr.y1]="w.start.y"
                [attr.x2]="w.end.x" [attr.y2]="w.end.y"
                [attr.stroke]="selectedWallId === w.id ? '#3B82F6' : 'var(--fg,#374151)'"
                [attr.stroke-width]="6 / zoom()"
                stroke-linecap="round"
                style="cursor:pointer"
                (mousedown)="onWallClick(w, $event)"
              />
            }

            <!-- Doors -->
            @for (d of doors; track d.id) {
              <g [attr.transform]="'translate(' + d.cx.x + ',' + d.cx.y + ') rotate(' + d.angle + ')'">
                <!-- door leaf arc: radius 40 -->
                <path
                  [attr.d]="'M 0 0 L 40 0 A 40 40 0 0 1 0 -40 Z'"
                  fill="rgba(59,130,246,0.12)"
                  [attr.stroke]="'var(--fg,#374151)'"
                  [attr.stroke-width]="2 / zoom()"
                />
              </g>
            }

            <!-- Windows -->
            @for (w of windows; track w.id) {
              <g [attr.transform]="'translate(' + w.cx.x + ',' + w.cx.y + ') rotate(' + w.angle + ')'">
                <rect
                  x="-25" y="-6"
                  width="50" height="12"
                  fill="rgba(147,197,253,0.3)"
                  [attr.stroke]="'var(--fg,#374151)'"
                  [attr.stroke-width]="2 / zoom()"
                />
                <!-- hatch lines -->
                <line x1="-10" y1="-6" x2="-10" y2="6"
                  [attr.stroke]="'var(--fg,#374151)'"
                  [attr.stroke-width]="1 / zoom()"/>
                <line x1="10" y1="-6" x2="10" y2="6"
                  [attr.stroke]="'var(--fg,#374151)'"
                  [attr.stroke-width]="1 / zoom()"/>
              </g>
            }

            <!-- Measures -->
            @for (m of measures; track m.id) {
              <g>
                <line
                  [attr.x1]="m.start.x" [attr.y1]="m.start.y"
                  [attr.x2]="m.end.x" [attr.y2]="m.end.y"
                  stroke="var(--fg,#374151)"
                  [attr.stroke-width]="1.5 / zoom()"
                  stroke-dasharray="4,3"
                  marker-start="url(#arrow-start)"
                  marker-end="url(#arrow-end)"
                />
                <text
                  [attr.x]="(m.start.x + m.end.x) / 2"
                  [attr.y]="(m.start.y + m.end.y) / 2 - 8 / zoom()"
                  [attr.font-size]="12 / zoom()"
                  fill="var(--fg,#374151)"
                  text-anchor="middle"
                >{{ measureLabel(m) }}</text>
              </g>
            }

            <!-- In-progress preview -->
            @if (drawStart && drawCurrent) {
              <line
                [attr.x1]="drawStart.x" [attr.y1]="drawStart.y"
                [attr.x2]="drawCurrent.x" [attr.y2]="drawCurrent.y"
                stroke="#3B82F6"
                [attr.stroke-width]="(state.drawTool() === 'wall' ? 6 : 2) / zoom()"
                stroke-dasharray="6,4"
                stroke-linecap="round"
                pointer-events="none"
              />
              @if (state.drawTool() === 'measure') {
                <text
                  [attr.x]="(drawStart.x + drawCurrent.x) / 2"
                  [attr.y]="(drawStart.y + drawCurrent.y) / 2 - 10 / zoom()"
                  [attr.font-size]="12 / zoom()"
                  fill="#3B82F6"
                  text-anchor="middle"
                  pointer-events="none"
                >{{ previewMeasureLabel() }}</text>
              }
            }

          </g><!-- end viewport group -->

          <!-- Empty state hint (in SVG overlay, not transformed) -->
          @if (walls.length === 0 && !drawStart) {
            <g pointer-events="none">
              <text x="50%" y="calc(50% - 20px)" dominant-baseline="middle" text-anchor="middle"
                font-size="13" fill="var(--muted,#9CA3AF)" font-weight="500">2D Floor Plan</text>
              <text x="50%" y="calc(50% + 10px)" dominant-baseline="middle" text-anchor="middle"
                font-size="11" fill="var(--muted,#9CA3AF)">Use the drawing tools on the left to add walls, doors and windows</text>
            </g>
          }

        </svg>

        <!-- Zoom controls overlay -->
        <div class="zoom-controls">
          <button class="zoom-btn" (click)="zoomIn()" title="Zoom in">+</button>
          <span class="zoom-pct">{{ zoom() * 100 | number:'1.0-0' }}%</span>
          <button class="zoom-btn" (click)="zoomOut()" title="Zoom out">−</button>
          <button class="zoom-btn" (click)="resetView()" title="Fit to screen">⊡</button>
        </div>

      </div>
    }
  `,
})
export class StudioCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('svg2d') svg2dRef?: ElementRef<SVGSVGElement>;

  readonly state = inject(StudioStateService);
  private readonly renderer = inject(RendererService);
  private readonly sceneEngine = inject(SceneEngine);
  private readonly injector = inject(Injector);
  private resizeObserver!: ResizeObserver;
  dragging = false;

  // ─── Viewport signals ─────────────────────────────────────────────────────
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);

  readonly viewTransform = computed(
    () => `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`
  );

  readonly patternTransform = computed(
    () => `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`
  );

  readonly svgCursor = computed(() => {
    const tool = this.state.drawTool();
    if (tool === 'pan') return 'grab';
    if (tool === 'select') return 'default';
    return 'crosshair';
  });

  // ─── Drawing state ────────────────────────────────────────────────────────
  drawStart: Pt | null = null;
  drawCurrent: Pt | null = null;
  isPanning = false;
  lastMouse = { x: 0, y: 0 };

  // ─── Element state ────────────────────────────────────────────────────────
  walls: Wall[] = [];
  doors: Door2D[] = [];
  windows: Win2D[] = [];
  measures: Measure[] = [];
  selectedWallId: string | null = null;

  // ─── DXF banner ───────────────────────────────────────────────────────────
  dwgBanner: string | null = null;
  private dwgBannerTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    if (this.state.viewMode() === '3d') this.init3D();
  }

  private init3D(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
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
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.state.viewMode() === '3d') this.renderer.ngOnDestroy();
    if (this.dwgBannerTimer) clearTimeout(this.dwgBannerTimer);
  }

  // ─── Coordinate helpers ───────────────────────────────────────────────────
  private svgPoint(e: MouseEvent): Pt {
    const svg = this.svg2dRef?.nativeElement;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    // Convert screen → SVG world space (account for pan and zoom)
    const worldX = (screenX - this.panX()) / this.zoom();
    const worldY = (screenY - this.panY()) / this.zoom();
    return { x: worldX, y: worldY };
  }

  private snap(pt: Pt): Pt {
    if (!this.state.snapGrid()) return pt;
    const g = 30; // 0.5 grid cell = 30px
    return { x: Math.round(pt.x / g) * g, y: Math.round(pt.y / g) * g };
  }

  // ─── Mouse event handlers ─────────────────────────────────────────────────
  onDown(e: MouseEvent): void {
    e.preventDefault();
    const tool = this.state.drawTool();

    // Middle-mouse always pans
    if (e.button === 1) {
      this.isPanning = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return;

    if (tool === 'pan') {
      this.isPanning = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'wall' || tool === 'measure') {
      const pt = this.snap(this.svgPoint(e));
      if (!this.drawStart) {
        this.drawStart = pt;
        this.drawCurrent = pt;
      } else {
        // Complete the element
        const end = this.snap(this.svgPoint(e));
        if (tool === 'wall') {
          this.walls = [...this.walls, { id: crypto.randomUUID(), start: this.drawStart, end }];
        } else {
          this.measures = [...this.measures, { id: crypto.randomUUID(), start: this.drawStart, end }];
        }
        this.drawStart = null;
        this.drawCurrent = null;
      }
      return;
    }

    if (tool === 'door') {
      const pt = this.snap(this.svgPoint(e));
      this.doors = [...this.doors, { id: crypto.randomUUID(), cx: pt, angle: 0 }];
      return;
    }

    if (tool === 'window') {
      const pt = this.snap(this.svgPoint(e));
      this.windows = [...this.windows, { id: crypto.randomUUID(), cx: pt, angle: 0 }];
      return;
    }

    if (tool === 'select') {
      // Deselect on empty click — wall selection is in onWallClick
      this.selectedWallId = null;
    }
  }

  onMove(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.panX.update(v => v + dx);
      this.panY.update(v => v + dy);
      this.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    if (this.drawStart) {
      this.drawCurrent = this.snap(this.svgPoint(e));
    }
  }

  onUp(e: MouseEvent): void {
    if (e.button === 1 || this.state.drawTool() === 'pan') {
      this.isPanning = false;
    }
  }

  onLeave(): void {
    this.isPanning = false;
    // Cancel in-progress draw when mouse leaves canvas
    if (this.drawStart) {
      this.drawStart = null;
      this.drawCurrent = null;
    }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const svg = this.svg2dRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.min(4, Math.max(0.15, this.zoom() * factor));
    const ratio = newZoom / this.zoom();

    // Adjust pan so cursor point stays fixed
    this.panX.update(px => cursorX - ratio * (cursorX - px));
    this.panY.update(py => cursorY - ratio * (cursorY - py));
    this.zoom.set(newZoom);
  }

  // ─── Wall click (for selection) ───────────────────────────────────────────
  onWallClick(wall: Wall, e: MouseEvent): void {
    if (this.state.drawTool() !== 'select') return;
    e.stopPropagation();
    this.selectedWallId = wall.id;
  }

  // ─── Zoom controls ────────────────────────────────────────────────────────
  zoomIn(): void {
    this.zoom.update(z => Math.min(4, z * 1.2));
  }

  zoomOut(): void {
    this.zoom.update(z => Math.max(0.15, z / 1.2));
  }

  resetView(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  // ─── Measure labels ───────────────────────────────────────────────────────
  measureLabel(m: Measure): string {
    const dx = m.end.x - m.start.x;
    const dy = m.end.y - m.start.y;
    const px = Math.sqrt(dx * dx + dy * dy);
    // 60px = 0.5m
    const meters = px / 120;
    return meters.toFixed(2) + ' m';
  }

  previewMeasureLabel(): string {
    if (!this.drawStart || !this.drawCurrent) return '';
    const dx = this.drawCurrent.x - this.drawStart.x;
    const dy = this.drawCurrent.y - this.drawStart.y;
    const px = Math.sqrt(dx * dx + dy * dy);
    const meters = px / 120;
    return meters.toFixed(2) + ' m';
  }

  // ─── DXF/DWG upload ───────────────────────────────────────────────────────
  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.dwg')) {
      this.showBanner('DWG is proprietary — please export to DXF from AutoCAD');
      input.value = '';
      return;
    }

    if (file.name.toLowerCase().endsWith('.dxf')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = this.parseDxf(text);
        if (parsed.length === 0) {
          this.showBanner('No LINE entities found in the DXF file');
        } else {
          this.walls = parsed;
          this.resetView();
        }
      };
      reader.readAsText(file);
    }
    input.value = '';
  }

  private showBanner(msg: string): void {
    this.dwgBanner = msg;
    if (this.dwgBannerTimer) clearTimeout(this.dwgBannerTimer);
    this.dwgBannerTimer = setTimeout(() => { this.dwgBanner = null; }, 5000);
  }

  parseDxf(text: string): Wall[] {
    const walls: Wall[] = [];
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === '0' && lines[i + 1] === 'LINE') {
        const coords: Record<string, number> = {};
        for (let j = i + 2; j < Math.min(i + 30, lines.length - 1); j++) {
          const code = lines[j];
          const val = parseFloat(lines[j + 1]);
          if (!isNaN(val)) coords[code] = val;
          j++;
        }
        if (coords['10'] !== undefined) {
          walls.push({
            id: crypto.randomUUID(),
            start: { x: coords['10'], y: coords['20'] ?? 0 },
            end: { x: coords['11'] ?? 0, y: coords['21'] ?? 0 },
          });
        }
      }
    }

    // Normalize to fit within ~600×600 units centered
    if (walls.length === 0) return walls;
    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = 600 / Math.max(rangeX, rangeY);
    const offsetX = (600 - rangeX * scale) / 2;
    const offsetY = (600 - rangeY * scale) / 2;

    return walls.map(w => ({
      ...w,
      start: {
        x: (w.start.x - minX) * scale + offsetX,
        y: (w.start.y - minY) * scale + offsetY,
      },
      end: {
        x: (w.end.x - minX) * scale + offsetX,
        y: (w.end.y - minY) * scale + offsetY,
      },
    }));
  }
}
