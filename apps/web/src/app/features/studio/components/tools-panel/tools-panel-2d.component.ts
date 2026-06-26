import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudioStateService, type DrawTool } from '../../services/studio-state.service';
import { FloorPlanService } from '../../services/floor-plan.service';

interface ToolDef {
  id: DrawTool;
  label: string;
  shortcut: string;
  icon: string; // SVG path data (24x24 viewBox)
}

interface ToolGroup {
  label: string;
  tools: ToolDef[];
}

@Component({
  selector: 'dito-tools-panel-2d',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: flex; flex-direction: column; width: 52px; flex-shrink: 0; background: var(--panel-bg); border-right: 1px solid var(--border); overflow: hidden; }
    .group { display: flex; flex-direction: column; align-items: center; padding: 4px 0; border-bottom: 1px solid var(--border); }
    .group:last-of-type { border-bottom: none; }
    .group-label { font-size: 8px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); text-transform: uppercase; margin-bottom: 2px; }
    .tool-btn {
      position: relative; width: 40px; height: 40px; border: none; border-radius: 8px; cursor: pointer;
      background: transparent; color: var(--muted); display: flex; align-items: center; justify-content: center;
      margin: 1px 0; transition: background 120ms, color 120ms; flex-shrink: 0;
    }
    .tool-btn:hover { background: rgba(255,255,255,0.07); color: var(--fg); }
    .tool-btn.active { background: #2563EB; color: white; }
    .tool-btn svg { width: 20px; height: 20px; }
    /* tooltip */
    .tool-btn::after {
      content: attr(data-tip);
      position: absolute; left: 52px; top: 50%; transform: translateY(-50%);
      background: #1E293B; color: white; font-size: 11px; padding: 4px 8px; border-radius: 6px;
      white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 120ms;
      z-index: 1000; border: 1px solid rgba(255,255,255,0.1);
    }
    .tool-btn:hover::after { opacity: 1; }
    /* divider actions at bottom */
    .actions { margin-top: auto; border-top: 1px solid var(--border); padding: 6px 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .act-btn { width: 40px; height: 32px; border: none; border-radius: 6px; background: transparent; color: var(--muted); cursor: pointer; font-size: 10px; transition: all 120ms; }
    .act-btn:hover { background: rgba(255,255,255,0.07); color: var(--fg); }
    .snap-bar { padding: 4px 0; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .snap-btn { width: 40px; height: 28px; border: none; border-radius: 5px; background: transparent; color: var(--muted); cursor: pointer; font-size: 8px; font-weight: 700; letter-spacing: 0.05em; transition: all 120ms; }
    .snap-btn.on { background: rgba(37,99,235,0.25); color: #60A5FA; }
  `],
  template: `
    <div style="overflow-y:auto;flex:1;display:flex;flex-direction:column">
      @for (group of toolGroups; track group.label) {
        <div class="group">
          <span class="group-label">{{ group.label }}</span>
          @for (tool of group.tools; track tool.id) {
            <button class="tool-btn"
              [class.active]="state.drawTool() === tool.id"
              [attr.data-tip]="tool.label + ' (' + tool.shortcut + ')'"
              (click)="state.setDrawTool(tool.id)"
              [title]="tool.label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path [attr.d]="tool.icon"/>
              </svg>
            </button>
          }
        </div>
      }

      <!-- Snap toggles -->
      <div class="snap-bar">
        <span class="group-label">Snap</span>
        <button class="snap-btn" [class.on]="state.snapGrid()" (click)="state.toggleSnap('grid')" title="Grid snap">Grid</button>
        <button class="snap-btn" [class.on]="state.snapWall()" (click)="state.toggleSnap('wall')" title="Endpoint snap">End</button>
        <button class="snap-btn" [class.on]="state.snapMidpoint()" (click)="state.toggleSnap('midpoint')" title="Midpoint snap">Mid</button>
        <button class="snap-btn" [class.on]="state.snapAngle()" (click)="state.toggleSnap('angle')" title="Angle snap (15°)">Ang</button>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="actions">
      <button class="act-btn" (click)="fitView.emit()" title="Fit view (F)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M4 14v6h6M20 10V4h-6M4 10V4h6M20 14v6h-6"/></svg>
      </button>
      <button class="act-btn" (click)="zoomIn.emit()" title="Zoom in (+)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6m4 4 2 2"/></svg>
      </button>
      <button class="act-btn" (click)="zoomOut.emit()" title="Zoom out (-)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="11" cy="11" r="7"/><path d="M8 11h6m4 4 2 2"/></svg>
      </button>
      <button class="act-btn" [class.on]="state.showLayers()" (click)="state.showLayers.update(v=>!v)" title="Layers"
        style="font-size:9px;font-weight:700;color:var(--muted)">LAY</button>
    </div>
  `,
})
export class ToolsPanel2DComponent {
  readonly state = inject(StudioStateService);
  readonly floorPlan = inject(FloorPlanService);

  readonly fitView  = output<void>();
  readonly zoomIn   = output<void>();
  readonly zoomOut  = output<void>();

  readonly toolGroups: ToolGroup[] = [
    {
      label: 'Select',
      tools: [
        { id: 'select',     label: 'Select',     shortcut: 'S', icon: 'M5 3l14 9-7 1-4 7z' },
        { id: 'box-select', label: 'Box Select', shortcut: 'B', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' },
        { id: 'lasso',      label: 'Lasso',      shortcut: 'L', icon: 'M5 12c0-3.9 3.1-7 7-7s7 3.1 7 7-3.1 7-7 7c-2 0-3.8-.8-5.1-2.2L5 21V12z' },
      ],
    },
    {
      label: 'Walls',
      tools: [
        { id: 'wall',      label: 'Wall',        shortcut: 'W', icon: 'M3 6h18v3H3zM3 15h18v3H3z' },
        { id: 'room-rect', label: 'Room',        shortcut: 'R', icon: 'M3 3h18v18H3z' },
        { id: 'curve',     label: 'Curve Wall',  shortcut: 'C', icon: 'M3 18C3 10 8 6 12 6s9 4 9 12' },
      ],
    },
    {
      label: 'Draw',
      tools: [
        { id: 'line',     label: 'Line',     shortcut: '/', icon: 'M4 20L20 4' },
        { id: 'rect',     label: 'Rectangle',shortcut: 'E', icon: 'M4 4h16v16H4z' },
        { id: 'circle',   label: 'Circle',   shortcut: 'O', icon: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0' },
        { id: 'polygon',  label: 'Polygon',  shortcut: 'G', icon: 'M12 3l8 5v8l-8 5-8-5V8z' },
        { id: 'polyline', label: 'Polyline', shortcut: 'Y', icon: 'M3 18l5-10 4 6 3-4 6 8' },
        { id: 'freehand', label: 'Freehand', shortcut: 'H', icon: 'M3 17c3-3 5-8 9-8s6 5 9 2' },
      ],
    },
    {
      label: 'Elements',
      tools: [
        { id: 'door',   label: 'Door',    shortcut: 'D', icon: 'M3 3h8v18H3zM11 8a6 6 0 0 1 6 6' },
        { id: 'window', label: 'Window',  shortcut: 'I', icon: 'M3 9h18v6H3zM12 9v6' },
        { id: 'stair',  label: 'Stair',   shortcut: 'X', icon: 'M4 20h4v-4h4v-4h4v-4h4v-4' },
      ],
    },
    {
      label: 'Annotate',
      tools: [
        { id: 'text',         label: 'Text',      shortcut: 'T', icon: 'M4 7V4h16v3M9 20h6M12 4v16' },
        { id: 'label',        label: 'Label',     shortcut: 'K', icon: 'M20 12V6a2 2 0 0 0-2-2H4l-1 5 1 5h14a2 2 0 0 0 2-2zM8 9h8M8 12h5' },
        { id: 'note',         label: 'Note',      shortcut: 'N', icon: 'M4 4h16v12H4zM4 16l4-4M4 4l4 4' },
        { id: 'measure',      label: 'Dimension', shortcut: 'M', icon: 'M3 12h18M3 8v8M21 8v8' },
        { id: 'measure-area', label: 'Area',      shortcut: 'A', icon: 'M3 3h18v18H3zM7 7h10v10H7z' },
      ],
    },
    {
      label: 'Edit',
      tools: [
        { id: 'move',       label: 'Move',        shortcut: 'V', icon: 'M12 3l3 3H9zM3 12l3-3v6zM21 12l-3 3v-6zM12 21l-3-3h6z' },
        { id: 'split-wall', label: 'Split Wall',  shortcut: 'U', icon: 'M3 12h18M12 3v18' },
        { id: 'mirror',     label: 'Mirror',      shortcut: 'F', icon: 'M12 3v18M5 6l4 6-4 6M19 6l-4 6 4 6' },
      ],
    },
    {
      label: 'Nav',
      tools: [
        { id: 'pan', label: 'Pan', shortcut: 'Space', icon: 'M9 3H7a2 2 0 0 0-2 2v2M9 21H7a2 2 0 0 1-2-2v-2M15 3h2a2 2 0 0 1 2 2v2M15 21h2a2 2 0 0 0 2-2v-2M12 8v8M8 12h8' },
      ],
    },
  ];
}
