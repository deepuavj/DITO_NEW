import {
  Component, ElementRef, ViewChild, AfterViewInit,
  OnDestroy, inject, effect, Injector, signal, computed, HostListener,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RendererService } from '../../services/renderer.service';
import { SceneEngine } from '../../../../engines/scene/scene.engine';
import { MetadataEngine } from '../../../../engines/metadata/metadata.engine';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import { FloorPlanService } from '../../services/floor-plan.service';
import type { FPWall, FPDoor, FPWindow, FPMeasure, FPArc } from '../../services/floor-plan.service';

// ─── 2D data model re-exports for template compatibility ──────────────────────
export type Pt = import('../../services/floor-plan.service').Pt;
export type WallMeta = import('../../services/floor-plan.service').WallMeta;
export type DoorMeta = import('../../services/floor-plan.service').DoorMeta;
export type WinMeta  = import('../../services/floor-plan.service').WinMeta;
export type MeasureMeta = import('../../services/floor-plan.service').MeasureMeta;

// Local aliases to keep template references working
export type Wall    = FPWall;
export type Door2D  = FPDoor;
export type Win2D   = FPWindow;
export type Measure = FPMeasure;
export type Arc = FPArc;

export interface RoomLabel { id: string; cx: Pt; area: number }
export type Elem2D = FPWall | FPDoor | FPWindow | FPMeasure | FPArc;

const PIXELS_PER_METER = 100; // 100 SVG units = 1 m
const DEFAULT_WALL_META: WallMeta = { thickness: 200, height: 2800, material: 'concrete', color: '#D4C8B8' };
const DEFAULT_DOOR_META: DoorMeta = { width: 900, height: 2100, swingDir: 'left', openAngle: 90 };
const DEFAULT_WIN_META:  WinMeta  = { width: 1200, height: 1100, sillH: 900 };

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function pxToM(px: number): number { return px / PIXELS_PER_METER; }

function dist(a: Pt, b: Pt): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// Wall as thick polygon (two parallel lines + fill)
function wallPolygon(w: FPWall): string {
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len; const uy = dy / len;
  const nx = -uy; const ny = ux;
  const halfT = (w.meta.thickness / 2000) * PIXELS_PER_METER; // mm → m → px
  const pts = [
    { x: w.start.x + nx * halfT, y: w.start.y + ny * halfT },
    { x: w.end.x   + nx * halfT, y: w.end.y   + ny * halfT },
    { x: w.end.x   - nx * halfT, y: w.end.y   - ny * halfT },
    { x: w.start.x - nx * halfT, y: w.start.y - ny * halfT },
  ];
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z';
}

function wallAngle(w: FPWall): number {
  return Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x) * 180 / Math.PI;
}

// Compute door arc path: quarter-circle swing
function doorPath(d: FPDoor): string {
  const w = (d.meta.width / 1000) * PIXELS_PER_METER;
  const sweep = d.meta.swingDir === 'right' ? 1 : 0;
  const ex = w; const ey = d.meta.swingDir === 'right' ? -w : w;
  return `M0,0 L${ex.toFixed(1)},0 A${w.toFixed(1)},${w.toFixed(1)} 0 0,${sweep} 0,${ey.toFixed(1)} Z`;
}

// Nice ruler intervals (meters)
const RULER_INTERVALS_M = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
function rulerInterval(zoom: number): number {
  const targetPx = 80; // desired screen-space tick spacing
  for (const m of RULER_INTERVALS_M) {
    if (m * PIXELS_PER_METER * zoom >= targetPx) return m;
  }
  return 100;
}

@Component({
  selector: 'dito-studio-canvas',
  imports: [CommonModule, DecimalPipe],
  providers: [RendererService],
  styles: [`
    :host { display: flex; flex-direction: column; width: 100%; height: 100%; position: relative; overflow: hidden; }
    /* Both panels are stacked absolutely; only the active one is on top */
    .panel-3d, .canvas-2d {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      transition: none;
    }
    .panel-3d.hidden, .canvas-2d.hidden {
      z-index: -1; pointer-events: none; visibility: hidden;
    }
    .panel-3d.visible, .canvas-2d.visible { z-index: 1; }

    canvas { display: block; width: 100%; height: 100%; outline: none; }

    /* ── 2D container ── */
    .canvas-2d { overflow: hidden; background: var(--canvas-bg, #F4F5F7); display: flex; flex-direction: column; }

    /* ── Ruler + canvas layout ── */
    .canvas-2d-body { display: flex; flex: 1; min-height: 0; }
    .ruler-h-wrap   { display: flex; height: 24px; flex-shrink: 0; }
    .ruler-corner   { width: 24px; height: 24px; background: var(--panel-bg); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); flex-shrink: 0; }
    .ruler-h        { flex: 1; overflow: hidden; }
    .ruler-v        { width: 24px; flex-shrink: 0; overflow: hidden; }
    svg.ruler-svg   { display: block; }
    .canvas-area    { flex: 1; position: relative; overflow: hidden; min-width: 0; min-height: 0; }

    /* ── Main SVG ── */
    .canvas-2d-svg  { display: block; width: 100%; height: 100%; user-select: none; }

    /* ── Zoom controls ── */
    .zoom-controls  { position: absolute; bottom: 12px; right: 12px; display: flex; align-items: center; gap: 2px; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 8px; padding: 4px 8px; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .zoom-btn       { width: 24px; height: 24px; border: none; background: none; color: var(--fg); font-size: 15px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .zoom-btn:hover { background: rgba(255,255,255,0.1); }
    .zoom-pct       { font-size: 11px; color: var(--muted); min-width: 38px; text-align: center; font-weight: 600; }

    /* ── Banner ── */
    .banner { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(234,88,12,0.92); color: white; padding: 7px 16px; border-radius: 6px; font-size: 12px; z-index: 20; white-space: nowrap; }

    /* ── Cursor coord readout ── */
    .coord-readout { position: absolute; bottom: 12px; left: 12px; font-size: 10px; color: var(--muted); font-family: monospace; background: var(--panel-bg); border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px; z-index: 10; pointer-events: none; }
  `],
  template: `
    <!-- ── 3D WebGL canvas (always in DOM so OrbitControls stays bound) ── -->
    <div class="panel-3d" [class.visible]="state.viewMode() === '3d'" [class.hidden]="state.viewMode() !== '3d'"
      (dragover)="$event.preventDefault()" (drop)="onDrop3d($event)">
      <canvas #canvas tabindex="0"
        (click)="onCanvasClick($event)"
        (pointerdown)="on3dPointerDown($event)"
        (pointermove)="on3dPointerMove($event)"
        (pointerup)="on3dPointerUp($event)"
        (dragover)="$event.preventDefault()" (drop)="onDrop3d($event)"></canvas>
    </div>

    <!-- ── 2D Floor Plan ── -->
    <div class="canvas-2d" [class.visible]="state.viewMode() !== '3d'" [class.hidden]="state.viewMode() === '3d'">

        <!-- banner -->
        @if (banner) { <div class="banner">{{ banner }}</div> }

        <!-- ruler row (horizontal) -->
        <div class="ruler-h-wrap">
          <div class="ruler-corner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <text x="12" y="14" font-size="7" fill="var(--muted)" text-anchor="middle">m</text>
            </svg>
          </div>
          <div class="ruler-h" #rulerHWrap>
            <svg class="ruler-svg" [attr.width]="canvasW()" height="24" [attr.viewBox]="'0 0 ' + canvasW() + ' 24'">
              <rect width="100%" height="24" fill="var(--panel-bg)"/>
              <line x1="0" y1="23" [attr.x2]="canvasW()" y2="23" stroke="var(--border)" stroke-width="1"/>
              @for (tick of hTicks(); track tick.pos) {
                <line [attr.x1]="tick.pos" y1="23" [attr.x2]="tick.pos" [attr.y2]="tick.major ? 8 : 16" stroke="var(--muted)" stroke-width="0.75"/>
                @if (tick.major) {
                  <text [attr.x]="tick.pos + 2" y="11" font-size="8" fill="var(--muted)">{{ tick.label }}</text>
                }
              }
              <!-- cursor indicator -->
              <line [attr.x1]="cursorScreenX()" y1="0" [attr.x2]="cursorScreenX()" y2="24" stroke="#3B82F6" stroke-width="1" opacity="0.6"/>
            </svg>
          </div>
        </div>

        <!-- body: vertical ruler + canvas -->
        <div class="canvas-2d-body">
          <div class="ruler-v" #rulerVWrap>
            <svg class="ruler-svg" width="24" [attr.height]="canvasH()" [attr.viewBox]="'0 0 24 ' + canvasH()">
              <rect width="24" height="100%" fill="var(--panel-bg)"/>
              <line x1="23" y1="0" x2="23" [attr.y2]="canvasH()" stroke="var(--border)" stroke-width="1"/>
              @for (tick of vTicks(); track tick.pos) {
                <line x1="23" [attr.y1]="tick.pos" [attr.x2]="tick.major ? 8 : 16" [attr.y2]="tick.pos" stroke="var(--muted)" stroke-width="0.75"/>
                @if (tick.major) {
                  <text [attr.x]="1" [attr.y]="tick.pos - 2" font-size="8" fill="var(--muted)" transform-origin="0 0" [attr.transform]="'rotate(-90,' + 12 + ',' + tick.pos + ')'">{{ tick.label }}</text>
                }
              }
              <!-- cursor indicator -->
              <line x1="0" [attr.y1]="cursorScreenY()" x2="24" [attr.y2]="cursorScreenY()" stroke="#3B82F6" stroke-width="1" opacity="0.6"/>
            </svg>
          </div>

          <!-- Main drawing canvas -->
          <div class="canvas-area" #canvasArea>
            <svg class="canvas-2d-svg" #svg2d
              xmlns="http://www.w3.org/2000/svg"
              [attr.width]="canvasW()"
              [attr.height]="canvasH()"
              [style.cursor]="cursor()"
              (mousedown)="onDown($event)"
              (mousemove)="onMove($event)"
              (mouseup)="onUp($event)"
              (mouseleave)="onLeave()"
              (wheel)="onWheel($event)"
              (dblclick)="onDblClick($event)">

              <defs>
                <!-- minor grid: 0.5m = 50px world units -->
                <pattern id="minorGrid" [attr.width]="50" [attr.height]="50"
                  patternUnits="userSpaceOnUse"
                  [attr.patternTransform]="patTransform()">
                  <path d="M 50 0 L 0 0 0 50" fill="none"
                    stroke="var(--grid-minor,rgba(128,128,128,0.1))" stroke-width="0.5"/>
                </pattern>
                <!-- major grid: 5m = 500px -->
                <pattern id="majorGrid" [attr.width]="500" [attr.height]="500"
                  patternUnits="userSpaceOnUse"
                  [attr.patternTransform]="patTransform()">
                  <rect width="500" height="500" fill="url(#minorGrid)"/>
                  <path d="M 500 0 L 0 0 0 500" fill="none"
                    stroke="var(--grid-major,rgba(128,128,128,0.2))" stroke-width="1"/>
                </pattern>
                <!-- door fill -->
                <pattern id="doorFill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(59,130,246,0.2)" stroke-width="2"/>
                </pattern>
                <!-- window hatch -->
                <pattern id="winHatch" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M0,0 L8,8 M8,0 L0,8" stroke="rgba(147,197,253,0.6)" stroke-width="1"/>
                </pattern>
                <!-- measure arrow -->
                <marker id="arr-s" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#F59E0B"/>
                </marker>
                <marker id="arr-e" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#F59E0B"/>
                </marker>
              </defs>

              <!-- canvas background -->
              <rect width="100%" height="100%" fill="var(--canvas-bg)"/>

              <!-- grid background (full SVG area, not transformed) -->
              @if (state.showGrid()) {
                <rect width="100%" height="100%" fill="url(#majorGrid)"/>
              }

              <!-- viewport transform group -->
              <g [attr.transform]="viewTransform()">

                <!-- ── Walls (thick polygons) ── -->
                @for (w of walls; track w.id) {
                  <g class="wall-group" [class.selected]="selectedId === w.id">
                    <!-- wall fill — draggable body when selected + select tool -->
                    <path [attr.d]="wallPoly(w)"
                      [attr.fill]="selectedId === w.id ? 'rgba(59,130,246,0.15)' : w.meta.color"
                      [attr.stroke]="selectedId === w.id ? '#3B82F6' : 'var(--fg,#374151)'"
                      [attr.stroke-width]="1.5 / zoom()"
                      stroke-linejoin="round"
                      [style.cursor]="selectedId === w.id && state.drawTool() === 'select' ? 'move' : 'pointer'"
                      (mousedown)="onWallBodyDown($event, w.id)"/>
                    <!-- wall centerline (thin, dashed, only when selected) -->
                    @if (selectedId === w.id) {
                      <line [attr.x1]="w.start.x" [attr.y1]="w.start.y"
                            [attr.x2]="w.end.x"   [attr.y2]="w.end.y"
                            stroke="#3B82F6" stroke-width="0.5" stroke-dasharray="4,3" opacity="0.6" pointer-events="none"/>
                    }
                    <!-- dimension label on wall -->
                    @if (state.showDimensions()) {
                      <text
                        [attr.x]="(w.start.x + w.end.x) / 2"
                        [attr.y]="(w.start.y + w.end.y) / 2"
                        [attr.font-size]="10 / zoom()"
                        [attr.transform]="wallLabelTransform(w)"
                        fill="var(--fg,#374151)" text-anchor="middle" dominant-baseline="central"
                        pointer-events="none">{{ wallLabel(w) }}</text>
                    }
                    <!-- endpoint nodes — larger + blue when selected for easy drag -->
                    <circle [attr.cx]="w.start.x" [attr.cy]="w.start.y"
                      [attr.r]="(selectedId === w.id ? 6 : 3.5) / zoom()"
                      [attr.fill]="selectedId === w.id ? '#3B82F6' : 'white'"
                      stroke="var(--fg,#374151)" [attr.stroke-width]="1.5 / zoom()"
                      style="cursor:crosshair"
                      (mousedown)="onEndpointDown($event, w.id, 'start')"/>
                    <circle [attr.cx]="w.end.x" [attr.cy]="w.end.y"
                      [attr.r]="(selectedId === w.id ? 6 : 3.5) / zoom()"
                      [attr.fill]="selectedId === w.id ? '#3B82F6' : 'white'"
                      stroke="var(--fg,#374151)" [attr.stroke-width]="1.5 / zoom()"
                      style="cursor:crosshair"
                      (mousedown)="onEndpointDown($event, w.id, 'end')"/>
                  </g>
                }

                <!-- ── Doors ── -->
                @for (d of doors; track d.id) {
                  <g [attr.transform]="'translate(' + d.pos.x + ',' + d.pos.y + ') rotate(' + d.angle + ')'"
                    style="cursor:pointer"
                    (mousedown)="selectElem(d.id, 'door', $event)">
                    <path [attr.d]="doorArc(d)"
                      fill="url(#doorFill)"
                      [attr.stroke]="selectedId === d.id ? '#3B82F6' : 'var(--fg,#374151)'"
                      [attr.stroke-width]="1.5 / zoom()"/>
                    <!-- door frame line -->
                    <line [attr.x1]="0" y1="0"
                      [attr.x2]="(d.meta.width / 1000) * 100" y2="0"
                      [attr.stroke]="'var(--fg,#374151)'"
                      [attr.stroke-width]="4 / zoom()"
                      stroke-linecap="square"/>
                    @if (state.showDimensions()) {
                      <text [attr.x]="(d.meta.width / 1000) * 50" [attr.y]="-8 / zoom()"
                        [attr.font-size]="9 / zoom()" fill="var(--muted,#6B7280)" text-anchor="middle" pointer-events="none">
                        {{ d.meta.width }} mm
                      </text>
                    }
                  </g>
                }

                <!-- ── Windows ── -->
                @for (w of windows; track w.id) {
                  <g [attr.transform]="'translate(' + w.pos.x + ',' + w.pos.y + ') rotate(' + w.angle + ')'"
                    style="cursor:pointer"
                    (mousedown)="selectElem(w.id, 'window', $event)">
                    @let ww = (w.meta.width / 1000) * 100;
                    <rect [attr.x]="-ww/2" [attr.y]="-6 / zoom()"
                      [attr.width]="ww" [attr.height]="12 / zoom()"
                      fill="url(#winHatch)"
                      [attr.stroke]="selectedId === w.id ? '#3B82F6' : 'var(--fg,#374151)'"
                      [attr.stroke-width]="2 / zoom()"/>
                    <!-- glass lines -->
                    <line [attr.x1]="-ww/6" [attr.y1]="-6/zoom()" [attr.x2]="-ww/6" [attr.y2]="6/zoom()"
                      stroke="rgba(147,197,253,0.8)" [attr.stroke-width]="1.5/zoom()"/>
                    <line [attr.x1]="ww/6" [attr.y1]="-6/zoom()" [attr.x2]="ww/6" [attr.y2]="6/zoom()"
                      stroke="rgba(147,197,253,0.8)" [attr.stroke-width]="1.5/zoom()"/>
                    @if (state.showDimensions()) {
                      <text [attr.x]="0" [attr.y]="-10/zoom()"
                        [attr.font-size]="9/zoom()" fill="var(--muted,#6B7280)" text-anchor="middle" pointer-events="none">
                        {{ w.meta.width }} mm
                      </text>
                    }
                  </g>
                }

                <!-- ── Room labels (auto from enclosed walls) ── -->
                @for (r of roomLabels(); track r.id) {
                  <g pointer-events="none">
                    <text [attr.x]="r.cx.x" [attr.y]="r.cx.y"
                      [attr.font-size]="11 / zoom()" fill="var(--muted,#9CA3AF)"
                      text-anchor="middle" dominant-baseline="central" font-weight="500">
                      {{ r.area.toFixed(1) }} m²
                    </text>
                  </g>
                }

                <!-- ── Dimensions / Measures ── -->
                @for (m of measures; track m.id) {
                  <g style="cursor:pointer" (mousedown)="selectElem(m.id, 'measure', $event)">
                    <!-- offset measure line (10px above/below) -->
                    <line
                      [attr.x1]="m.start.x" [attr.y1]="m.start.y - 16/zoom()"
                      [attr.x2]="m.end.x"   [attr.y2]="m.end.y - 16/zoom()"
                      stroke="#F59E0B" [attr.stroke-width]="1.2/zoom()"
                      marker-start="url(#arr-s)" marker-end="url(#arr-e)"/>
                    <!-- witness lines -->
                    <line [attr.x1]="m.start.x" [attr.y1]="m.start.y" [attr.x2]="m.start.x" [attr.y2]="m.start.y - 22/zoom()"
                      stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()"/>
                    <line [attr.x1]="m.end.x" [attr.y1]="m.end.y" [attr.x2]="m.end.x" [attr.y2]="m.end.y - 22/zoom()"
                      stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()"/>
                    <!-- label -->
                    <rect
                      [attr.x]="(m.start.x+m.end.x)/2 - 20/zoom()"
                      [attr.y]="(m.start.y+m.end.y)/2 - 30/zoom()"
                      [attr.width]="40/zoom()" [attr.height]="14/zoom()"
                      fill="var(--panel-bg)" stroke="#F59E0B" [attr.stroke-width]="0.6/zoom()" rx="2"/>
                    <text
                      [attr.x]="(m.start.x+m.end.x)/2"
                      [attr.y]="(m.start.y+m.end.y)/2 - 23/zoom()"
                      [attr.font-size]="10/zoom()" fill="#F59E0B"
                      text-anchor="middle" dominant-baseline="central"
                      pointer-events="none">{{ measureLabel(m) }}</text>
                  </g>
                }

                <!-- ── Arcs (bezier curve walls) ── -->
                @for (a of arcs; track a.id) {
                  <g class="arc-group" [class.selected]="selectedId === a.id"
                    style="cursor:pointer" (mousedown)="selectElem(a.id, 'arc', $event)">
                    <path [attr.d]="arcPath(a)"
                      fill="none"
                      [attr.stroke]="selectedId === a.id ? '#3B82F6' : a.meta.color"
                      [attr.stroke-width]="(a.meta.thickness / 1000) * 100 / zoom()"
                      stroke-linecap="round" stroke-linejoin="round"/>
                    @if (selectedId === a.id) {
                      <path [attr.d]="arcPath(a)"
                        fill="none" stroke="#3B82F6"
                        [attr.stroke-width]="(a.meta.thickness / 1000) * 100 / zoom() + 2 / zoom()"
                        stroke-linecap="round" opacity="0.3" pointer-events="none"/>
                    }
                    @if (selectedId === a.id) {
                      <circle [attr.cx]="a.start.x" [attr.cy]="a.start.y" [attr.r]="5/zoom()" fill="#3B82F6" stroke="white" [attr.stroke-width]="1.5/zoom()" pointer-events="none"/>
                      <circle [attr.cx]="a.ctrl.x" [attr.cy]="a.ctrl.y" [attr.r]="4/zoom()" fill="#F59E0B" stroke="white" [attr.stroke-width]="1.5/zoom()" pointer-events="none"/>
                      <circle [attr.cx]="a.end.x" [attr.cy]="a.end.y" [attr.r]="5/zoom()" fill="#3B82F6" stroke="white" [attr.stroke-width]="1.5/zoom()" pointer-events="none"/>
                      <line [attr.x1]="a.start.x" [attr.y1]="a.start.y" [attr.x2]="a.ctrl.x" [attr.y2]="a.ctrl.y" stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()" stroke-dasharray="3,3" opacity="0.6" pointer-events="none"/>
                      <line [attr.x1]="a.end.x" [attr.y1]="a.end.y" [attr.x2]="a.ctrl.x" [attr.y2]="a.ctrl.y" stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()" stroke-dasharray="3,3" opacity="0.6" pointer-events="none"/>
                    }
                    @if (state.showDimensions()) {
                      <text [attr.x]="a.ctrl.x" [attr.y]="a.ctrl.y - 10/zoom()"
                        [attr.font-size]="10/zoom()" fill="var(--fg)" text-anchor="middle" pointer-events="none">
                        {{ arcLabel(a) }}
                      </text>
                    }
                  </g>
                }

                <!-- Curve preview (phase 1: start set, hovering for ctrl point) -->
                @if (curvePhase() === 1 && curveStart() && drawCurrent()) {
                  <path [attr.d]="'M' + curveStart()!.x + ',' + curveStart()!.y + ' Q' + drawCurrent()!.x + ',' + drawCurrent()!.y + ' ' + drawCurrent()!.x + ',' + drawCurrent()!.y"
                    fill="none" stroke="#3B82F6" [attr.stroke-width]="2/zoom()" stroke-dasharray="5,3" pointer-events="none"/>
                  <circle [attr.cx]="curveStart()!.x" [attr.cy]="curveStart()!.y" [attr.r]="4/zoom()" fill="#3B82F6" pointer-events="none"/>
                }
                <!-- Curve preview (phase 2: start+ctrl set, hovering for end) -->
                @if (curvePhase() === 2 && curveStart() && curveCtrl() && drawCurrent()) {
                  <path [attr.d]="'M' + curveStart()!.x + ',' + curveStart()!.y + ' Q' + curveCtrl()!.x + ',' + curveCtrl()!.y + ' ' + drawCurrent()!.x + ',' + drawCurrent()!.y"
                    fill="none" stroke="#3B82F6" [attr.stroke-width]="4/zoom()" opacity="0.7" pointer-events="none"/>
                  <circle [attr.cx]="curveStart()!.x" [attr.cy]="curveStart()!.y" [attr.r]="4/zoom()" fill="#3B82F6" pointer-events="none"/>
                  <circle [attr.cx]="curveCtrl()!.x" [attr.cy]="curveCtrl()!.y" [attr.r]="4/zoom()" fill="#F59E0B" pointer-events="none"/>
                  <line [attr.x1]="curveStart()!.x" [attr.y1]="curveStart()!.y" [attr.x2]="curveCtrl()!.x" [attr.y2]="curveCtrl()!.y" stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()" stroke-dasharray="3,3" pointer-events="none"/>
                  <line [attr.x1]="drawCurrent()!.x" [attr.y1]="drawCurrent()!.y" [attr.x2]="curveCtrl()!.x" [attr.y2]="curveCtrl()!.y" stroke="#F59E0B" [attr.stroke-width]="0.8/zoom()" stroke-dasharray="3,3" pointer-events="none"/>
                }

                <!-- ── In-progress preview ── -->
                @if (drawStart() && drawCurrent()) {
                  @if (state.drawTool() === 'wall') {
                    <path [attr.d]="previewWallPoly()"
                      fill="rgba(59,130,246,0.15)" stroke="#3B82F6"
                      [attr.stroke-width]="1.5/zoom()" stroke-dasharray="5,3" pointer-events="none"/>
                  } @else {
                    <line
                      [attr.x1]="drawStart()!.x" [attr.y1]="drawStart()!.y"
                      [attr.x2]="drawCurrent()!.x" [attr.y2]="drawCurrent()!.y"
                      stroke="#3B82F6" [attr.stroke-width]="1.5/zoom()"
                      stroke-dasharray="5,3" pointer-events="none"/>
                  }
                  <!-- live distance tooltip -->
                  <g pointer-events="none">
                    <rect
                      [attr.x]="drawCurrent()!.x + 8/zoom()"
                      [attr.y]="drawCurrent()!.y - 10/zoom()"
                      [attr.width]="42/zoom()" [attr.height]="14/zoom()"
                      fill="rgba(30,40,70,0.9)" rx="3" [attr.stroke-width]="0"/>
                    <text
                      [attr.x]="drawCurrent()!.x + 8/zoom()"
                      [attr.y]="drawCurrent()!.y + 1/zoom()"
                      [attr.font-size]="9/zoom()" fill="white" dominant-baseline="central">
                      {{ liveLabel() }}
                    </text>
                  </g>
                }

                <!-- ── Snap indicator ── -->
                @if (snapPt()) {
                  <circle [attr.cx]="snapPt()!.x" [attr.cy]="snapPt()!.y"
                    [attr.r]="4/zoom()" fill="none" stroke="#3B82F6"
                    [attr.stroke-width]="1.5/zoom()" pointer-events="none"/>
                  <line [attr.x1]="snapPt()!.x - 6/zoom()" [attr.y1]="snapPt()!.y"
                        [attr.x2]="snapPt()!.x + 6/zoom()" [attr.y2]="snapPt()!.y"
                        stroke="#3B82F6" [attr.stroke-width]="1/zoom()" pointer-events="none"/>
                  <line [attr.x1]="snapPt()!.x" [attr.y1]="snapPt()!.y - 6/zoom()"
                        [attr.x2]="snapPt()!.x" [attr.y2]="snapPt()!.y + 6/zoom()"
                        stroke="#3B82F6" [attr.stroke-width]="1/zoom()" pointer-events="none"/>
                }

                <!-- ── Empty state ── -->
                @if (walls.length === 0 && !drawStart()) {
                  <g pointer-events="none" [attr.transform]="emptyHintTransform()">
                    <rect x="-120" y="-36" width="240" height="72" rx="8"
                      fill="var(--panel-bg)" stroke="var(--border)" stroke-width="1" opacity="0.85"/>
                    <text x="0" y="-10" font-size="13" fill="var(--muted,#9CA3AF)" font-weight="600" text-anchor="middle">2D Floor Plan</text>
                    <text x="0" y="12" font-size="10" fill="var(--muted,#9CA3AF)" text-anchor="middle">Select a drawing tool from the left panel</text>
                    <text x="0" y="26" font-size="10" fill="var(--muted,#9CA3AF)" text-anchor="middle">Click-drag to draw · Scroll to zoom</text>
                  </g>
                }

              </g><!-- end viewport group -->
            </svg>

            <!-- ── Zoom controls ── -->
            <div class="zoom-controls">
              <button class="zoom-btn" (click)="zoomIn()">+</button>
              <span class="zoom-pct">{{ (zoom() * 100) | number:'1.0-0' }}%</span>
              <button class="zoom-btn" (click)="zoomOut()">−</button>
              <button class="zoom-btn" title="Fit to content" (click)="fitView()">⊡</button>
            </div>

            <!-- ── Cursor coordinates ── -->
            <div class="coord-readout">
              X: {{ cursorWorld().x | number:'1.2-2' }} m &nbsp; Y: {{ cursorWorld().y | number:'1.2-2' }} m
            </div>

          </div><!-- canvas-area -->
        </div><!-- canvas-2d-body -->
      </div><!-- canvas-2d -->
  `,
})
export class StudioCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas')    canvasRef?:   ElementRef<HTMLCanvasElement>;
  @ViewChild('svg2d')     svg2dRef?:    ElementRef<SVGSVGElement>;
  @ViewChild('canvasArea') canvasAreaRef?: ElementRef<HTMLDivElement>;

  readonly state     = inject(StudioStateService);
  readonly history   = inject(HistoryService);
  readonly floorPlan = inject(FloorPlanService);
  private readonly renderer       = inject(RendererService);
  private readonly sceneEngine    = inject(SceneEngine);
  private readonly metadataEngine = inject(MetadataEngine);
  private readonly injector       = inject(Injector);
  private resizeObserver!: ResizeObserver;
  private threeInitialized = false;

  // ─── 2D scene data via FloorPlanService ─────────────────────────────────────
  get walls():    FPWall[]    { return this.floorPlan.walls(); }
  get doors():    FPDoor[]    { return this.floorPlan.doors(); }
  get windows():  FPWindow[]  { return this.floorPlan.windows(); }
  get measures(): FPMeasure[] { return this.floorPlan.measures(); }
  get arcs():     FPArc[]     { return this.floorPlan.arcs(); }

  selectedId: string | null = null;
  selectedType: 'wall' | 'door' | 'window' | 'measure' | 'arc' | null = null;

  // ─── Viewport signals ────────────────────────────────────────────────────────
  readonly zoom = signal(1);
  readonly panX = signal(50);
  readonly panY = signal(50);

  // Canvas dimensions
  readonly canvasW = signal(800);
  readonly canvasH = signal(600);

  // ─── Drawing signals ─────────────────────────────────────────────────────────
  readonly drawStart   = signal<Pt | null>(null);
  readonly drawCurrent = signal<Pt | null>(null);
  readonly snapPt      = signal<Pt | null>(null);
  readonly curvePhase  = signal<0 | 1 | 2>(0);
  readonly curveStart  = signal<Pt | null>(null);
  readonly curveCtrl   = signal<Pt | null>(null);
  readonly cursorScreenX = signal(0);
  readonly cursorScreenY = signal(0);

  // Mouse state (non-signal, no reactivity needed)
  private isPanning = false;
  private lastMouse = { x: 0, y: 0 };
  // Wall editing state
  private wallEndpointEdit: { wallId: string; endpoint: 'start' | 'end' } | null = null;
  private wallBodyDrag: { wallId: string; lastPt: Pt } | null = null;
  banner: string | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Computed transforms ─────────────────────────────────────────────────────
  readonly viewTransform = computed(
    () => `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`
  );
  readonly patTransform = computed(
    () => `translate(${this.panX()},${this.panY()}) scale(${this.zoom()})`
  );

  // Cursor in world coordinates
  readonly cursorWorld = computed<Pt>(() => {
    const sx = this.cursorScreenX();
    const sy = this.cursorScreenY();
    const wx = (sx - this.panX()) / this.zoom() / PIXELS_PER_METER;
    const wy = (sy - this.panY()) / this.zoom() / PIXELS_PER_METER;
    return { x: wx, y: wy };
  });

  // SVG cursor style
  readonly cursor = computed(() => {
    const tool = this.state.drawTool();
    if (tool === 'pan' || this.isPanning) return 'grab';
    if (tool === 'select') return 'default';
    if (tool === 'curve') return 'crosshair';
    return 'crosshair';
  });

  // Empty state hint — in world coords, centered in current viewport
  readonly emptyHintTransform = computed(() => {
    const cx = (this.canvasW() / 2 - this.panX()) / this.zoom();
    const cy = (this.canvasH() / 2 - this.panY()) / this.zoom();
    return `translate(${cx},${cy})`;
  });

  // Live distance label during draw
  readonly liveLabel = computed(() => {
    const s = this.drawStart(); const c = this.drawCurrent();
    if (!s || !c) return '';
    const d = dist(s, c) / PIXELS_PER_METER;
    return d < 1 ? (d * 100).toFixed(0) + ' cm' : d.toFixed(2) + ' m';
  });

  // ─── Rulers ─────────────────────────────────────────────────────────────────
  readonly hTicks = computed(() => {
    const iv = rulerInterval(this.zoom());
    const ivPx = iv * PIXELS_PER_METER * this.zoom();
    const startWorld = -this.panX() / this.zoom() / PIXELS_PER_METER;
    const endWorld   = (this.canvasW() - this.panX()) / this.zoom() / PIXELS_PER_METER;
    const ticks: { pos: number; major: boolean; label: string }[] = [];
    const firstTick = Math.ceil(startWorld / iv) * iv;
    for (let w = firstTick; w <= endWorld + iv; w = +(w + iv).toFixed(8)) {
      const screenX = w * PIXELS_PER_METER * this.zoom() + this.panX();
      if (screenX < 0 || screenX > this.canvasW()) continue;
      const major = Math.abs(w % (iv * 5)) < iv * 0.01;
      ticks.push({ pos: screenX, major, label: w.toFixed(iv < 1 ? 1 : 0) });
    }
    return ticks;
  });

  readonly vTicks = computed(() => {
    const iv = rulerInterval(this.zoom());
    const startWorld = -this.panY() / this.zoom() / PIXELS_PER_METER;
    const endWorld   = (this.canvasH() - this.panY()) / this.zoom() / PIXELS_PER_METER;
    const ticks: { pos: number; major: boolean; label: string }[] = [];
    const firstTick = Math.ceil(startWorld / iv) * iv;
    for (let w = firstTick; w <= endWorld + iv; w = +(w + iv).toFixed(8)) {
      const screenY = w * PIXELS_PER_METER * this.zoom() + this.panY();
      if (screenY < 0 || screenY > this.canvasH()) continue;
      const major = Math.abs(w % (iv * 5)) < iv * 0.01;
      ticks.push({ pos: screenY, major, label: w.toFixed(iv < 1 ? 1 : 0) });
    }
    return ticks;
  });

  // ─── Room labels (basic centroid from wall set) ──────────────────────────────
  readonly roomLabels = computed((): RoomLabel[] => {
    const walls = this.floorPlan.walls();
    if (walls.length < 3) return [];
    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
    const cy = (Math.min(...allY) + Math.max(...allY)) / 2;
    const totalLen = walls.reduce((s, w) => s + dist(w.start, w.end), 0);
    const areaM2 = (totalLen / PIXELS_PER_METER) ** 2 / (4 * Math.PI) * Math.PI;
    return [{ id: 'room0', cx: { x: cx, y: cy }, area: +areaM2.toFixed(1) }];
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngAfterViewInit(): void {
    this.observeCanvasSize();
    // Always defer 3D init to next rAF so the browser has done layout
    // (canvas.clientWidth is 0 if read synchronously in ngAfterViewInit)
    if (this.state.viewMode() === '3d') {
      requestAnimationFrame(() => this.init3D());
    }
    effect(() => {
      if (this.state.viewMode() === '3d' && !this.threeInitialized) {
        requestAnimationFrame(() => this.init3D());
      }
    }, { injector: this.injector });
  }

  private observeCanvasSize(): void {
    const el = this.canvasAreaRef?.nativeElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      this.canvasW.set(r.width);
      this.canvasH.set(r.height);
    });
    ro.observe(el);
    this.resizeObserver = ro;
  }

  private init3D(): void {
    if (this.threeInitialized) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.threeInitialized = true;  // set AFTER confirming canvas exists
    this.renderer.init(canvas);
    effect(() => { this.renderer.highlightObject(this.sceneEngine.selectedId()); }, { injector: this.injector });
    // Sync committed walls + live preview wall while drawing
    effect(() => {
      this.renderer.syncFloorPlan(
        this.floorPlan.walls(),
        this.floorPlan.doors(),
        this.floorPlan.windows(),
        this.drawStart() && this.drawCurrent()
          ? { id: '__preview__', start: this.drawStart()!, end: this.drawCurrent()!, meta: { thickness: 200, height: 2800, material: 'concrete', color: '#60A5FA' } }
          : null,
      );
    }, { injector: this.injector });
    effect(() => {
      const selType = this.floorPlan.selectedType();
      if (selType !== 'wall') this.renderer.highlightWall(null);
    }, { injector: this.injector });
    // Wire toolbar toggles to the 3D renderer
    effect(() => { this.renderer.setGridVisible(this.state.showGrid()); }, { injector: this.injector });
    // Reactively sync furniture objects whenever SceneEngine changes
    // (belt-and-suspenders alongside the animation loop's syncScene call)
    effect(() => {
      this.sceneEngine.objects(); // track the signal
      this.renderer.syncScene();
    }, { injector: this.injector });
    // Override the 2D resize observer with the 3D one
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) this.renderer.resize(width, height);
    });
    this.resizeObserver.observe(canvas.parentElement!);
  }

  onCanvasClick(e: MouseEvent): void {
    // Ignore click if it ended a drag (pointer moved significantly)
    if (this.renderer.isDragging) return;
    const mode = this.state.mode();
    const c = this.canvasRef?.nativeElement;
    if (!c) return;
    const hit = this.renderer.pick(e, c);
    if (!hit) {
      if (mode === 'select') {
        this.sceneEngine.select(null);
        this.floorPlan.clearSelection();
        this.state.setSelectionState('none');
      }
      return;
    }
    if (hit.type === 'object') {
      this.sceneEngine.select(hit.id);
      this.floorPlan.clearSelection();
      this.state.setSelectionState('furniture');
    } else if (hit.type === 'wall') {
      this.sceneEngine.select(null);
      this.floorPlan.selectedId.set(hit.id);
      this.floorPlan.selectedType.set('wall');
      this.state.setSelectionState('wall');
      this.renderer.highlightWall(hit.id);
    }
  }

  on3dPointerDown(e: PointerEvent): void {
    if (this.state.viewMode() !== '3d') return;
    const mode = this.state.mode();
    if (mode === 'select') return; // select handled by click
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const grabbed = this.renderer.beginDrag(e, canvas, mode as 'move' | 'rotate' | 'scale');
    if (grabbed) {
      canvas.setPointerCapture(e.pointerId);
      e.stopPropagation();
    }
  }

  on3dPointerMove(e: PointerEvent): void {
    if (this.state.viewMode() !== '3d' || !this.renderer.isDragging) return;
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.renderer.updateDrag(e, canvas);
  }

  on3dPointerUp(e: PointerEvent): void {
    if (this.state.viewMode() !== '3d') return;
    if (this.renderer.isDragging) {
      this.renderer.endDrag();
      this.history.push('Transform object');
      this.canvasRef?.nativeElement?.releasePointerCapture(e.pointerId);
    }
  }

  onDrop3d(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer?.getData('application/dito-asset');
    if (!raw) { console.warn('[DITO] drop fired but no asset data'); return; }
    let asset: any;
    try { asset = JSON.parse(raw); } catch (err) {
      console.error('[DITO] Failed to parse drag asset:', err);
      return;
    }
    console.log('[DITO] Dropping asset:', asset.name);
    this.metadataEngine.register(asset.id, asset.metadata ?? {});
    if (asset.glbUrl) this.metadataEngine.setGlbUrl(asset.id, asset.glbUrl);
    const walls = this.floorPlan.walls();
    let cx = 3.5, cz = 3;
    if (walls.length > 0) {
      const allX = walls.flatMap((w: any) => [w.start.x, w.end.x]);
      const allZ = walls.flatMap((w: any) => [w.start.y, w.end.y]);
      cx = (Math.min(...allX) + Math.max(...allX)) / 2 / PIXELS_PER_METER;
      cz = (Math.min(...allZ) + Math.max(...allZ)) / 2 / PIXELS_PER_METER;
    }
    this.sceneEngine.addObject(asset.id, asset.name, [cx, 0, cz]);
    this.history.push(`Added ${asset.name}`);
    // Force immediate sync so object appears without waiting for next rAF
    this.renderer.syncScene();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.threeInitialized) this.renderer.ngOnDestroy();
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
  }

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (this.state.viewMode() === '3d') {
      if (e.key === 'Escape') { this.sceneEngine.select(null); this.state.setSelectionState('none'); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && this.sceneEngine.selectedId()) {
        const id = this.sceneEngine.selectedId()!;
        this.sceneEngine.removeObject(id);
        this.state.setSelectionState('none');
        this.history.push('Delete object');
      }
      return;
    }
    if (e.key === 'Escape') {
      this.drawStart.set(null); this.drawCurrent.set(null);
      this.curvePhase.set(0); this.curveStart.set(null); this.curveCtrl.set(null);
      this.selectedId = null;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId) this.deleteSelected();
    if (e.key === 'f' || e.key === 'F') this.fitView();
  }

  // ─── Coordinate helpers ──────────────────────────────────────────────────────
  private screenToWorld(sx: number, sy: number): Pt {
    return {
      x: (sx - this.panX()) / this.zoom(),
      y: (sy - this.panY()) / this.zoom(),
    };
  }

  private snap(pt: Pt): Pt {
    // 1. Grid snap
    let result = pt;
    if (this.state.snapGrid()) {
      const g = 50 / 2; // snap to half-grid = 25px
      result = { x: Math.round(pt.x / g) * g, y: Math.round(pt.y / g) * g };
    }
    // 2. Wall endpoint snap (override grid if close)
    if (this.state.snapWall()) {
      const threshold = 10 / this.zoom();
      for (const w of this.floorPlan.walls()) {
        for (const ep of [w.start, w.end]) {
          if (dist(pt, ep) < threshold) return ep;
        }
      }
    }
    return result;
  }

  private getSVGPoint(e: MouseEvent): Pt {
    const svg = this.svg2dRef?.nativeElement;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ─── Wall snapping for doors/windows ────────────────────────────────────────
  private nearestWallPoint(pt: Pt): { pos: Pt; angle: number; wallId: string } | null {
    let best: { pos: Pt; angle: number; wallId: string; d: number } | null = null;
    for (const w of this.floorPlan.walls()) {
      const dx = w.end.x - w.start.x;
      const dy = w.end.y - w.start.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((pt.x - w.start.x) * dx + (pt.y - w.start.y) * dy) / len2));
      const proj = { x: w.start.x + t * dx, y: w.start.y + t * dy };
      const d = Math.sqrt((pt.x - proj.x) ** 2 + (pt.y - proj.y) ** 2);
      if (!best || d < best.d) {
        best = { pos: proj, angle: Math.atan2(dy, dx) * 180 / Math.PI, wallId: w.id, d };
      }
    }
    // Only snap if within reasonable threshold (200px world units)
    return best && best.d < 200 / this.zoom() ? best : null;
  }

  // ─── Wall endpoint / body drag ───────────────────────────────────────────────
  onEndpointDown(e: MouseEvent, wallId: string, endpoint: 'start' | 'end'): void {
    e.stopPropagation();
    e.preventDefault();
    // Auto-select wall
    this.selectedId = wallId;
    this.selectedType = 'wall';
    this.floorPlan.selectedId.set(wallId);
    this.floorPlan.selectedType.set('wall');
    this.state.setSelectionState('wall');
    this.wallEndpointEdit = { wallId, endpoint };
    this.wallBodyDrag = null;
    this.floorPlan.snapshot();
  }

  onWallBodyDown(e: MouseEvent, wallId: string): void {
    e.stopPropagation();
    e.preventDefault();
    const tool = this.state.drawTool();
    // Only drag body when in select mode and wall is already selected
    if (tool === 'select') {
      this.selectedId = wallId;
      this.selectedType = 'wall';
      this.floorPlan.selectedId.set(wallId);
      this.floorPlan.selectedType.set('wall');
      this.state.setSelectionState('wall');
      const screen = this.getSVGPoint(e);
      const world = this.screenToWorld(screen.x, screen.y);
      this.wallBodyDrag = { wallId, lastPt: world };
      this.wallEndpointEdit = null;
      this.floorPlan.snapshot();
    }
  }

  // ─── Mouse events ────────────────────────────────────────────────────────────
  onDown(e: MouseEvent): void {
    e.preventDefault();
    const tool = this.state.drawTool();
    const screen = this.getSVGPoint(e);

    if (e.button === 1 || tool === 'pan') {
      this.isPanning = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button !== 0) return;

    const world = this.snap(this.screenToWorld(screen.x, screen.y));

    if (tool === 'curve') {
      const phase = this.curvePhase();
      if (phase === 0) {
        this.curveStart.set(world);
        this.drawCurrent.set(world);
        this.curvePhase.set(1);
      } else if (phase === 1) {
        this.curveCtrl.set(world);
        this.curvePhase.set(2);
      } else {
        // commit arc
        const s = this.curveStart()!;
        const ctrl = this.curveCtrl()!;
        this.floorPlan.snapshot();
        this.floorPlan.arcs.update(as => [...as, { id: uid(), start: s, ctrl, end: world, meta: { ...DEFAULT_WALL_META } }]);
        this.history.push('Draw curve wall');
        // chain: start next from this end
        this.curveStart.set(world);
        this.curveCtrl.set(null);
        this.curvePhase.set(1);
        this.drawCurrent.set(world);
      }
      return;
    }

    if (tool === 'wall' || tool === 'measure') {
      const ds = this.drawStart();
      if (!ds) {
        this.drawStart.set(world);
        this.drawCurrent.set(world);
      } else {
        const end = world;
        if (tool === 'wall') {
          this.floorPlan.snapshot();
          this.floorPlan.walls.update(ws => [...ws, { id: uid(), start: ds, end, meta: { ...DEFAULT_WALL_META } }]);
          this.history.push('Draw wall');
          // chain: start next wall from end of this one
          this.drawStart.set(end);
          this.drawCurrent.set(end);
        } else {
          this.floorPlan.snapshot();
          this.floorPlan.measures.update(ms => [...ms, { id: uid(), start: ds, end, meta: { unit: 'm' as const } }]);
          this.history.push('Add measure');
          this.drawStart.set(null);
          this.drawCurrent.set(null);
        }
      }
      return;
    }

    if (tool === 'door') {
      const snapped = this.nearestWallPoint(world);
      const pos  = snapped ? snapped.pos  : world;
      const angle = snapped ? snapped.angle : 0;
      const wallId = snapped ? snapped.wallId : null;
      this.floorPlan.snapshot();
      this.floorPlan.doors.update(ds => [...ds, { id: uid(), pos, angle, wallId, meta: { ...DEFAULT_DOOR_META } }]);
      this.history.push('Place door');
      return;
    }
    if (tool === 'window') {
      const snapped = this.nearestWallPoint(world);
      const pos   = snapped ? snapped.pos   : world;
      const angle  = snapped ? snapped.angle  : 0;
      const wallId = snapped ? snapped.wallId : null;
      this.floorPlan.snapshot();
      this.floorPlan.windows.update(ws => [...ws, { id: uid(), pos, angle, wallId, meta: { ...DEFAULT_WIN_META } }]);
      this.history.push('Place window');
      return;
    }
    if (tool === 'select') {
      this.selectedId = null;
      this.selectedType = null;
    }
  }

  onDblClick(e: MouseEvent): void {
    // Double-click ends wall chain
    if (this.state.drawTool() === 'wall') {
      this.drawStart.set(null);
      this.drawCurrent.set(null);
    }
  }

  onMove(e: MouseEvent): void {
    const screen = this.getSVGPoint(e);
    this.cursorScreenX.set(screen.x);
    this.cursorScreenY.set(screen.y);

    if (this.isPanning) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.panX.update(v => v + dx);
      this.panY.update(v => v + dy);
      this.lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    const raw = this.screenToWorld(screen.x, screen.y);
    const snapped = this.snap(raw);
    this.snapPt.set(snapped);
    this.state.cursorX.set(+(raw.x / PIXELS_PER_METER).toFixed(2));
    this.state.cursorY.set(+(raw.y / PIXELS_PER_METER).toFixed(2));

    // Wall endpoint drag
    if (this.wallEndpointEdit) {
      const { wallId, endpoint } = this.wallEndpointEdit;
      this.floorPlan.walls.update(ws =>
        ws.map(w => w.id === wallId
          ? { ...w, [endpoint]: snapped }
          : w
        )
      );
      return;
    }

    // Wall body drag (translate whole wall)
    if (this.wallBodyDrag) {
      const { wallId, lastPt } = this.wallBodyDrag;
      const dx = raw.x - lastPt.x;
      const dy = raw.y - lastPt.y;
      this.floorPlan.walls.update(ws =>
        ws.map(w => w.id === wallId
          ? { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } }
          : w
        )
      );
      this.wallBodyDrag = { wallId, lastPt: raw };
      return;
    }

    if (this.state.drawTool() === 'curve' && this.curvePhase() > 0) {
      this.drawCurrent.set(snapped);
    }
    if (this.drawStart()) {
      this.drawCurrent.set(snapped);
    }
  }

  onUp(e: MouseEvent): void {
    if (e.button === 1 || this.state.drawTool() === 'pan') this.isPanning = false;
    if (this.wallEndpointEdit) {
      this.history.push('Resize wall');
      this.wallEndpointEdit = null;
    }
    if (this.wallBodyDrag) {
      this.history.push('Move wall');
      this.wallBodyDrag = null;
    }
  }

  onLeave(): void {
    this.isPanning = false;
    this.snapPt.set(null);
    if (this.wallEndpointEdit) { this.history.push('Resize wall'); this.wallEndpointEdit = null; }
    if (this.wallBodyDrag) { this.history.push('Move wall'); this.wallBodyDrag = null; }
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const sx = this.cursorScreenX();
    const sy = this.cursorScreenY();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.min(5, Math.max(0.1, this.zoom() * factor));
    const ratio = newZoom / this.zoom();
    this.panX.update(px => sx - ratio * (sx - px));
    this.panY.update(py => sy - ratio * (sy - py));
    this.zoom.set(newZoom);
    this.state.zoom2d.set(Math.round(newZoom * 100));
  }

  // ─── Element selection ───────────────────────────────────────────────────────
  selectElem(id: string, type: 'wall' | 'door' | 'window' | 'measure' | 'arc', e: MouseEvent): void {
    if (this.state.drawTool() !== 'select') return;
    e.stopPropagation();
    this.selectedId = id;
    this.selectedType = type;
    this.floorPlan.selectedId.set(id);
    if (type === 'measure' || type === 'arc') this.floorPlan.selectedType.set(null);
    else this.floorPlan.selectedType.set(type);
    if (type === 'wall' || type === 'arc') this.state.setSelectionState('wall');
    else if (type === 'door' || type === 'window') this.state.setSelectionState('furniture');
    else this.state.setSelectionState('none');
  }

  deleteSelected(): void {
    if (!this.selectedId) return;
    const id = this.selectedId;
    this.floorPlan.snapshot();
    this.floorPlan.walls.update(ws => ws.filter(w => w.id !== id));
    this.floorPlan.doors.update(ds => ds.filter(d => d.id !== id));
    this.floorPlan.windows.update(ws => ws.filter(w => w.id !== id));
    this.floorPlan.measures.update(ms => ms.filter(m => m.id !== id));
    this.floorPlan.arcs.update(as => as.filter(a => a.id !== id));
    this.history.push('Delete element');
    this.selectedId = null;
    this.selectedType = null;
    this.floorPlan.clearSelection();
    this.state.setSelectionState('none');
  }

  // ─── Zoom controls ───────────────────────────────────────────────────────────
  zoomIn():  void { this.zoom.update(z => Math.min(5, z * 1.25)); this.state.zoom2d.set(Math.round(this.zoom() * 100)); }
  zoomOut(): void { this.zoom.update(z => Math.max(0.1, z / 1.25)); this.state.zoom2d.set(Math.round(this.zoom() * 100)); }

  fitView(): void {
    const walls = this.floorPlan.walls();
    if (walls.length === 0) { this.zoom.set(1); this.panX.set(50); this.panY.set(50); return; }
    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...allX) - 60, maxX = Math.max(...allX) + 60;
    const minY = Math.min(...allY) - 60, maxY = Math.max(...allY) + 60;
    const rangeX = maxX - minX, rangeY = maxY - minY;
    const w = this.canvasW(), h = this.canvasH();
    const z = Math.min(5, Math.max(0.1, Math.min(w / rangeX, h / rangeY) * 0.9));
    this.zoom.set(z);
    this.panX.set((w - rangeX * z) / 2 - minX * z);
    this.panY.set((h - rangeY * z) / 2 - minY * z);
  }

  // ─── Wall rendering helpers ──────────────────────────────────────────────────
  wallPoly(w: FPWall): string { return wallPolygon(w); }

  wallLabel(w: FPWall): string {
    const d = dist(w.start, w.end) / PIXELS_PER_METER;
    return d < 1 ? (d * 100).toFixed(0) + ' cm' : d.toFixed(2) + ' m';
  }

  wallLabelTransform(w: FPWall): string {
    const angle = wallAngle(w);
    const cx = (w.start.x + w.end.x) / 2;
    const cy = (w.start.y + w.end.y) / 2;
    const offset = (w.meta.thickness / 2000) * PIXELS_PER_METER + 10 / this.zoom();
    const nx = Math.sin(angle * Math.PI / 180);
    const ny = -Math.cos(angle * Math.PI / 180);
    return `translate(${cx + nx * offset},${cy + ny * offset}) rotate(${angle < -90 || angle > 90 ? angle + 180 : angle})`;
  }

  previewWallPoly(): string {
    const s = this.drawStart(); const c = this.drawCurrent();
    if (!s || !c) return '';
    return wallPolygon({ id: '', start: s, end: c, meta: { ...DEFAULT_WALL_META } });
  }

  // ─── Door rendering ──────────────────────────────────────────────────────────
  doorArc(d: FPDoor): string { return doorPath(d); }

  // ─── Measure label ───────────────────────────────────────────────────────────
  measureLabel(m: FPMeasure): string {
    const d = dist(m.start, m.end) / PIXELS_PER_METER;
    return d < 1 ? (d * 100).toFixed(0) + ' cm' : d.toFixed(2) + ' m';
  }

  // ─── Arc rendering helpers ───────────────────────────────────────────────────
  arcPath(a: FPArc): string {
    return `M${a.start.x.toFixed(1)},${a.start.y.toFixed(1)} Q${a.ctrl.x.toFixed(1)},${a.ctrl.y.toFixed(1)} ${a.end.x.toFixed(1)},${a.end.y.toFixed(1)}`;
  }

  arcLabel(a: FPArc): string {
    const steps = 20;
    let len = 0;
    let px = a.start.x, py = a.start.y;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mt = 1 - t;
      const x = mt*mt*a.start.x + 2*mt*t*a.ctrl.x + t*t*a.end.x;
      const y = mt*mt*a.start.y + 2*mt*t*a.ctrl.y + t*t*a.end.y;
      len += Math.sqrt((x-px)**2+(y-py)**2);
      px = x; py = y;
    }
    const d = len / PIXELS_PER_METER;
    return d < 1 ? (d * 100).toFixed(0) + ' cm' : d.toFixed(2) + ' m';
  }

  // ─── DXF upload ──────────────────────────────────────────────────────────────
  onFileUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.dwg')) {
      this.showBanner('DWG is proprietary — export to DXF from AutoCAD first');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = this.parseDxf(ev.target?.result as string);
      if (parsed.length === 0) { this.showBanner('No LINE entities found in DXF'); return; }
      this.floorPlan.snapshot();
      this.floorPlan.walls.set(parsed);
      this.history.push('Import DXF');
      this.fitView();
    };
    reader.readAsText(file);
    input.value = '';
  }

  private showBanner(msg: string): void {
    this.banner = msg;
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.banner = null; }, 5000);
  }

  private parseDxf(text: string): FPWall[] {
    const walls: FPWall[] = [];
    const lines = text.split('\n').map(l => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i] === '0' && (lines[i + 1] === 'LINE' || lines[i + 1] === 'LWPOLYLINE')) {
        if (lines[i + 1] === 'LINE') {
          const c: Record<string, number> = {};
          for (let j = i + 2; j < Math.min(i + 40, lines.length - 1); j += 2) {
            const v = parseFloat(lines[j + 1]);
            if (!isNaN(v)) c[lines[j]] = v;
          }
          if (c['10'] !== undefined)
            walls.push({ id: uid(), start: { x: c['10'], y: -(c['20'] ?? 0) }, end: { x: c['11'] ?? 0, y: -(c['21'] ?? 0) }, meta: { ...DEFAULT_WALL_META } });
        }
      }
    }
    if (!walls.length) return walls;
    const allX = walls.flatMap(w => [w.start.x, w.end.x]);
    const allY = walls.flatMap(w => [w.start.y, w.end.y]);
    const minX = Math.min(...allX), maxX = Math.max(...allX);
    const minY = Math.min(...allY), maxY = Math.max(...allY);
    const sc   = 600 / (Math.max(maxX - minX, maxY - minY) || 1);
    const ox   = (600 - (maxX - minX) * sc) / 2;
    const oy   = (600 - (maxY - minY) * sc) / 2;
    return walls.map(w => ({
      ...w,
      start: { x: (w.start.x - minX) * sc + ox, y: (w.start.y - minY) * sc + oy },
      end:   { x: (w.end.x   - minX) * sc + ox, y: (w.end.y   - minY) * sc + oy },
    }));
  }
}
