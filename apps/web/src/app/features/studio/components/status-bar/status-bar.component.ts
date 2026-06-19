import { Component, inject, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { StudioStateService } from '../../services/studio-state.service';

@Component({
  selector: 'dito-status-bar',
  imports: [CommonModule, DecimalPipe],
  styles: [`
    :host { display: block; }
    .status-bar { display: flex; align-items: center; justify-content: space-between; padding: 6px 16px; background: rgba(8,13,26,0.98); border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; flex-shrink: 0; }
    .status-items { display: flex; align-items: center; gap: 8px; color: #7C8CA0; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border: 1px solid rgba(255,255,255,0.15); border-radius: 2px; margin-right: 4px; }
    .status-val { color: #E2E8F0; font-family: monospace; }
    .status-divider { width: 1px; height: 12px; background: rgba(255,255,255,0.1); }
    .ai-render-btn { display: flex; align-items: center; gap: 6px; padding: 6px 16px; background: rgba(14,20,35,0.8); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: #E2E8F0; font-size: 12px; cursor: pointer; transition: all 150ms; }
    .ai-render-btn:hover { border-color: rgba(37,99,235,0.5); background: rgba(37,99,235,0.15); color: #60A5FA; }
    .dot { width: 8px; height: 8px; border: 1px solid rgba(255,255,255,0.2); border-radius: 2px; }
  `],
  template: `
    <div class="status-bar">
      <div class="status-items">
        <span><span class="status-dot"></span> Cursor</span>
        <span class="status-val">x: {{ state.cursorX() }}, y: {{ state.cursorY() }}</span>
        <span class="status-divider"></span>
        <span><span class="status-dot"></span> Zoom</span>
        <span class="status-val">{{ state.viewMode()==='2d' ? state.zoom2d() : 100 }}%</span>
        <span class="status-divider"></span>
        <span><span class="status-dot"></span> Items</span>
        <span class="status-val">{{ state.itemCount() }}</span>
        <span class="status-divider"></span>
        <span><span class="status-dot"></span> Total</span>
        <span class="status-val">₹{{ state.totalPrice() | number }}</span>
      </div>
      <button class="ai-render-btn" (click)="renderClicked.emit()">
        <span class="dot"></span> AI render
      </button>
    </div>
  `,
})
export class StatusBarComponent {
  readonly state = inject(StudioStateService);
  readonly saveClicked = output();
  readonly renderClicked = output();
}
