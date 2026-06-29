import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService, type Layer } from '../../services/floor-plan.service';

@Component({
  selector: 'dito-layers-panel',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .panel {
      width: 220px; background: var(--panel-bg, #0e1423); border: 1px solid var(--border, rgba(255,255,255,0.08));
      border-radius: 10px; padding: 0; overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .header { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border); }
    .title { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); flex: 1; }
    .close-btn { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; padding: 0; line-height: 1; transition: color 120ms; }
    .close-btn:hover { color: var(--fg); }
    .layer-row {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      transition: background 120ms; cursor: default;
    }
    .layer-row:hover { background: rgba(255,255,255,0.03); }
    .layer-row.hidden { opacity: 0.4; }
    .icon-btn { width: 24px; height: 24px; background: none; border: none; color: var(--muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 120ms; flex-shrink: 0; }
    .icon-btn:hover { background: rgba(255,255,255,0.08); color: var(--fg); }
    .icon-btn.locked { color: #F59E0B; }
    .color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .layer-name { flex: 1; font-size: 12px; color: var(--fg); }
    .layer-row.hidden .layer-name { color: var(--muted); font-style: italic; }
  `],
  template: `
    <div class="panel">
      <div class="header">
        <span class="title">LAYERS</span>
        <button class="close-btn" (click)="close.emit()">×</button>
      </div>
      @for (layer of floorPlan.layers(); track layer.id) {
        <div class="layer-row" [class.hidden]="!layer.visible">
          <!-- Eye toggle -->
          <button class="icon-btn" (click)="floorPlan.toggleLayer(layer.id)"
            [title]="layer.visible ? 'Hide layer' : 'Show layer'">
            @if (layer.visible) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            }
          </button>
          <!-- Lock toggle -->
          <button class="icon-btn" [class.locked]="layer.locked" (click)="floorPlan.lockLayer(layer.id)"
            [title]="layer.locked ? 'Unlock layer' : 'Lock layer'">
            @if (layer.locked) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
            }
          </button>
          <!-- Color dot -->
          <span class="color-dot" [style.background]="layer.color"></span>
          <!-- Name -->
          <span class="layer-name">{{ layer.name }}</span>
        </div>
      }
    </div>
  `,
})
export class LayersPanelComponent {
  readonly floorPlan = inject(FloorPlanService);
  readonly close = output<void>();
}
