import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import { FloorPlanService } from '../../services/floor-plan.service';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';
import type { DrawTool, StudioMode } from '../../services/studio-state.service';

/* ── Lucide-style SVG paths (24×24, stroke-only) ── */
const IC = {
  select:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7.07 17 2.51-7.42L21 11.07z"/></svg>`,
  move:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>`,
  rotate:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  scale:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
  pan:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 9.5V6a2 2 0 0 0-4 0v8l-1.7-3.4a2 2 0 0 0-3.3 2.2l3.6 5.8A6 6 0 0 0 10 22h2a6 6 0 0 0 6-6v-5a2 2 0 0 0-4 0"/></svg>`,
  wall:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="9"/><line x1="15" y1="15" x2="15" y2="21"/></svg>`,
  door:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4H6a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M13 20V4l6 3v13"/><circle cx="16" cy="12" r="0.5" fill="currentColor"/></svg>`,
  window:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
  measure: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4z"/><path d="m7.5 10.5 2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2"/></svg>`,
  undo:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
  redo:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/></svg>`,
  grid:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  ruler:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M3 10h18M5 5v14M19 5v14"/></svg>`,
  sun:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  moon:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>`,
  save:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
};

@Component({
  selector: 'dito-studio-toolbar',
  imports: [CommonModule, SafeHtmlPipe],
  styles: [`
    :host { display: block; }
    .toolbar { display: flex; align-items: center; gap: 4px; padding: 0 12px; height: 44px; background: rgba(10,15,28,0.99); border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
    .toolbar::-webkit-scrollbar { display: none; }
    .divider { width: 1px; height: 20px; background: rgba(255,255,255,0.08); flex-shrink: 0; margin: 0 6px; }
    .spacer { flex: 1; }

    /* 2D/3D pill */
    .view-pill { display: flex; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; overflow: hidden; flex-shrink: 0; }
    .view-btn { padding: 4px 14px; border: none; background: none; color: #6B7280; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 150ms; letter-spacing: 0.06em; }
    .view-btn.active { background: rgba(37,99,235,0.85); color: #fff; }

    /* tool buttons */
    .tool-btn { display: flex; align-items: center; gap: 6px; padding: 5px 9px; background: none; border: 1px solid transparent; border-radius: 6px; color: #6B7280; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 130ms; white-space: nowrap; flex-shrink: 0; }
    .tool-btn:hover { background: rgba(255,255,255,0.05); color: #C4C9D4; border-color: rgba(255,255,255,0.06); }
    .tool-btn.active { background: rgba(37,99,235,0.18); border-color: rgba(37,99,235,0.45); color: #93B4FF; }
    .tool-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .ic { width: 15px; height: 15px; display: flex; align-items: center; flex-shrink: 0; }
    .ic ::ng-deep svg { width: 100%; height: 100%; }

    /* icon-only */
    .icon-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: none; border: 1px solid transparent; border-radius: 6px; color: #6B7280; cursor: pointer; transition: all 130ms; flex-shrink: 0; }
    .icon-btn:hover { background: rgba(255,255,255,0.06); color: #C4C9D4; }
    .icon-btn.active { background: rgba(37,99,235,0.18); border-color: rgba(37,99,235,0.4); color: #93B4FF; }
    .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .icon-btn .ic { width: 15px; height: 15px; }

    /* save */
    .save-btn { display: flex; align-items: center; gap: 6px; padding: 5px 14px; background: rgba(37,99,235,0.12); border: 1px solid rgba(37,99,235,0.35); border-radius: 6px; color: #7BA3FF; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 150ms; flex-shrink: 0; }
    .save-btn:hover { background: rgba(37,99,235,0.25); color: #fff; }
    .save-btn .ic { width: 14px; height: 14px; }

    /* logo */
    .logo { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: #E2E8F0; margin-right: 4px; flex-shrink: 0; }
    .logo span { color: #3B82F6; }
  `],
  template: `
    <div class="toolbar">
      <div class="logo">DI<span>TO</span></div>

      <div class="divider"></div>

      <!-- 2D / 3D toggle -->
      <div class="view-pill">
        <button class="view-btn" [class.active]="state.viewMode()==='2d'" (click)="state.setViewMode('2d')">2D</button>
        <button class="view-btn" [class.active]="state.viewMode()==='3d'" (click)="state.setViewMode('3d')">3D</button>
      </div>

      <div class="divider"></div>

      <!-- mode-specific tools -->
      @if (state.viewMode() === '3d') {
        @for (t of tools3d; track t.mode) {
          <button class="tool-btn" [class.active]="state.mode()===t.mode" (click)="state.setMode(t.mode)">
            <span class="ic" [innerHTML]="t.icon | safeHtml"></span>{{ t.label }}
          </button>
        }
      } @else {
        @for (t of tools2d; track t.tool) {
          <button class="tool-btn" [class.active]="state.drawTool()===t.tool" (click)="state.setDrawTool(t.tool)">
            <span class="ic" [innerHTML]="t.icon | safeHtml"></span>{{ t.label }}
          </button>
        }
      }

      <div class="divider"></div>

      <!-- undo / redo -->
      <button class="icon-btn" title="Undo (Ctrl+Z)"
        [disabled]="state.viewMode()==='2d' ? !floorPlan.canUndo() : !history.canUndo()"
        (click)="doUndo()">
        <span class="ic" [innerHTML]="icons.undo | safeHtml"></span>
      </button>
      <button class="icon-btn" title="Redo (Ctrl+Shift+Z)"
        [disabled]="state.viewMode()==='2d' ? !floorPlan.canRedo() : !history.canRedo()"
        (click)="doRedo()">
        <span class="ic" [innerHTML]="icons.redo | safeHtml"></span>
      </button>

      <div class="divider"></div>

      <!-- grid / dims -->
      <button class="icon-btn" [class.active]="state.showGrid()" title="Toggle grid" (click)="state.showGrid.update(v=>!v)">
        <span class="ic" [innerHTML]="icons.grid | safeHtml"></span>
      </button>
      <button class="icon-btn" [class.active]="state.showDimensions()" title="Toggle dimensions" (click)="state.showDimensions.update(v=>!v)">
        <span class="ic" [innerHTML]="icons.ruler | safeHtml"></span>
      </button>

      <div class="spacer"></div>

      <!-- theme -->
      <button class="icon-btn" (click)="state.toggleTheme()" [title]="state.theme()==='dark' ? 'Light mode' : 'Dark mode'">
        <span class="ic" [innerHTML]="(state.theme()==='dark' ? icons.sun : icons.moon) | safeHtml"></span>
      </button>

      <div class="divider"></div>

      <!-- save -->
      <button class="save-btn" (click)="saveClicked.emit()">
        <span class="ic" [innerHTML]="icons.save | safeHtml"></span> Save
      </button>
    </div>
  `,
})
export class StudioToolbarComponent {
  readonly state = inject(StudioStateService);
  readonly history = inject(HistoryService);
  readonly floorPlan = inject(FloorPlanService);
  readonly saveClicked = output();
  readonly renderClicked = output();
  readonly icons = IC;

  doUndo(): void {
    if (this.state.viewMode() === '2d') this.floorPlan.undo();
    else this.history.undo();
  }

  doRedo(): void {
    if (this.state.viewMode() === '2d') this.floorPlan.redo();
    else this.history.redo();
  }

  readonly tools3d: { mode: StudioMode; label: string; icon: string }[] = [
    { mode: 'select', label: 'Select', icon: IC.select },
    { mode: 'move',   label: 'Move',   icon: IC.move   },
    { mode: 'rotate', label: 'Rotate', icon: IC.rotate },
    { mode: 'scale',  label: 'Scale',  icon: IC.scale  },
  ];

  readonly tools2d: { tool: DrawTool; label: string; icon: string }[] = [
    { tool: 'select',  label: 'Select',  icon: IC.select  },
    { tool: 'pan',     label: 'Pan',     icon: IC.pan     },
    { tool: 'wall',    label: 'Wall',    icon: IC.wall    },
    { tool: 'door',    label: 'Door',    icon: IC.door    },
    { tool: 'window',  label: 'Window',  icon: IC.window  },
    { tool: 'measure', label: 'Measure', icon: IC.measure },
  ];
}
