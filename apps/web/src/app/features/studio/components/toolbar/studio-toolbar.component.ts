import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudioStateService } from '../../services/studio-state.service';
import { HistoryService } from '../../services/history.service';
import type { DrawTool } from '../../services/studio-state.service';

@Component({
  selector: 'dito-studio-toolbar',
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(10,15,28,0.98); border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
    .toolbar::-webkit-scrollbar { display: none; }
    .divider { width: 1px; height: 24px; background: rgba(255,255,255,0.08); flex-shrink: 0; margin: 0 4px; }
    .spacer { flex: 1; }

    /* 2D/3D toggle pill */
    .view-pill { display: flex; background: rgba(20,30,55,0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
    .view-btn { padding: 5px 14px; border: none; background: none; color: #7C8CA0; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 150ms; letter-spacing: 0.04em; }
    .view-btn.active { background: rgba(37,99,235,0.9); color: #fff; }

    /* tool buttons */
    .tool-btn { display: flex; align-items: center; gap: 5px; padding: 5px 10px; background: none; border: 1px solid transparent; border-radius: 7px; color: #7C8CA0; font-size: 12px; cursor: pointer; transition: all 150ms; white-space: nowrap; flex-shrink: 0; }
    .tool-btn:hover { background: rgba(255,255,255,0.05); color: #CBD5E0; }
    .tool-btn.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.5); color: #60A5FA; }
    .tool-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .tool-icon { font-size: 14px; line-height: 1; }

    /* icon-only buttons */
    .icon-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background: none; border: 1px solid transparent; border-radius: 7px; color: #7C8CA0; font-size: 15px; cursor: pointer; transition: all 150ms; flex-shrink: 0; }
    .icon-btn:hover { background: rgba(255,255,255,0.06); color: #E2E8F0; }
    .icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    /* save button */
    .save-btn { display: flex; align-items: center; gap: 6px; padding: 5px 14px; background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.4); border-radius: 7px; color: #60A5FA; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 150ms; flex-shrink: 0; }
    .save-btn:hover { background: rgba(37,99,235,0.3); color: #fff; }

    /* theme toggle */
    .theme-btn { font-size: 16px; }
  `],
  template: `
    <div class="toolbar">
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
            <span class="tool-icon">{{ t.icon }}</span>{{ t.label }}
          </button>
        }
      } @else {
        @for (t of tools2d; track t.tool) {
          <button class="tool-btn" [class.active]="state.drawTool()===t.tool" (click)="state.setDrawTool(t.tool)">
            <span class="tool-icon">{{ t.icon }}</span>{{ t.label }}
          </button>
        }
      }

      <div class="divider"></div>

      <!-- undo / redo -->
      <button class="icon-btn" title="Undo" [disabled]="!history.canUndo()" (click)="history.undo()">↩</button>
      <button class="icon-btn" title="Redo" [disabled]="!history.canRedo()" (click)="history.redo()">↪</button>

      <div class="divider"></div>

      <!-- grid / dimensions toggles -->
      <button class="tool-btn" [class.active]="state.showGrid()" (click)="state.showGrid.update(v=>!v)">
        <span class="tool-icon">⊞</span>Grid
      </button>
      <button class="tool-btn" [class.active]="state.showDimensions()" (click)="state.showDimensions.update(v=>!v)">
        <span class="tool-icon">↔</span>Dims
      </button>

      <div class="spacer"></div>

      <!-- theme toggle -->
      <button class="icon-btn theme-btn" (click)="state.toggleTheme()" [title]="state.theme()==='dark' ? 'Switch to light' : 'Switch to dark'">
        {{ state.theme() === 'dark' ? '☀' : '🌙' }}
      </button>

      <!-- save -->
      <button class="save-btn" (click)="saveClicked.emit()">💾 Save</button>
    </div>
  `,
})
export class StudioToolbarComponent {
  readonly state = inject(StudioStateService);
  readonly history = inject(HistoryService);
  readonly saveClicked = output();
  readonly renderClicked = output();

  readonly tools3d = [
    { mode: 'select' as const, label: 'Select', icon: '↖' },
    { mode: 'move' as const, label: 'Move', icon: '✥' },
    { mode: 'rotate' as const, label: 'Rotate', icon: '↻' },
    { mode: 'scale' as const, label: 'Scale', icon: '⊞' },
  ];

  readonly tools2d: { tool: DrawTool; label: string; icon: string }[] = [
    { tool: 'select', label: 'Select', icon: '↖' },
    { tool: 'pan', label: 'Pan', icon: '✋' },
    { tool: 'wall', label: 'Wall', icon: '▬' },
    { tool: 'door', label: 'Door', icon: '🚪' },
    { tool: 'window', label: 'Window', icon: '⬜' },
    { tool: 'measure', label: 'Measure', icon: '📏' },
  ];
}
