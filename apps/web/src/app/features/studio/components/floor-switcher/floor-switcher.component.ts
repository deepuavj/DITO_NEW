import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FloorPlanService } from '../../services/floor-plan.service';

@Component({
  selector: 'dito-floor-switcher',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    :host { display: flex; align-items: center; height: 36px; background: var(--panel-bg); border-top: 1px solid var(--border); padding: 0 8px; gap: 3px; flex-shrink: 0; }
    .floor-tab {
      height: 28px; min-width: 40px; padding: 0 10px;
      font-size: 11px; font-weight: 600; border-radius: 6px 6px 0 0;
      border: 1px solid transparent; border-bottom: none;
      cursor: pointer; transition: all 120ms; white-space: nowrap;
      background: transparent; color: var(--muted);
    }
    .floor-tab:hover { background: rgba(255,255,255,0.06); color: var(--fg); }
    .floor-tab.active { background: rgba(37,99,235,0.2); border-color: rgba(37,99,235,0.35); color: #60A5FA; }
    .add-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px dashed var(--border); background: transparent; color: var(--muted); cursor: pointer; font-size: 16px; line-height: 1; transition: all 120ms; display: flex; align-items: center; justify-content: center; }
    .add-btn:hover { border-color: #2563EB; color: #2563EB; }
    .info { margin-left: auto; font-size: 10px; color: var(--muted); white-space: nowrap; }
    .del-btn { font-size: 10px; color: rgba(239,68,68,0.7); margin-left: 3px; background: none; border: none; cursor: pointer; padding: 0 2px; }
    .del-btn:hover { color: #EF4444; }
    .new-floor-input { height: 24px; padding: 0 8px; font-size: 11px; border: 1px solid rgba(37,99,235,0.4); border-radius: 4px; background: var(--input-bg, #1a253c); color: var(--fg); outline: none; width: 120px; }
  `],
  template: `
    @for (floor of floorPlan.floors(); track floor.id) {
      <button class="floor-tab" [class.active]="floorPlan.activeFloorId() === floor.id"
        (click)="floorPlan.setActiveFloor(floor.id)"
        [title]="floor.name + ' — elevation: ' + (floor.elevation/1000).toFixed(1) + 'm, height: ' + (floor.height/1000).toFixed(1) + 'm'">
        {{ floorAbbr(floor.name) }}
        @if (floorPlan.floors().length > 1) {
          <button class="del-btn" (click)="$event.stopPropagation(); floorPlan.removeFloor(floor.id)" title="Remove floor">×</button>
        }
      </button>
    }

    @if (addingFloor()) {
      <input #newFloorInput class="new-floor-input" [value]="newFloorName()"
        (input)="newFloorName.set($any($event.target).value)"
        (keydown.enter)="confirmAdd()"
        (keydown.escape)="addingFloor.set(false)"
        (blur)="confirmAdd()"
        placeholder="Floor name…"
        autofocus />
    } @else {
      <button class="add-btn" (click)="startAdd()" title="Add floor">+</button>
    }

    <span class="info">
      ↕ {{ floorPlan.activeFloor().height / 1000 | number:'1.1-1' }}m
    </span>
  `,
})
export class FloorSwitcherComponent {
  readonly floorPlan = inject(FloorPlanService);
  readonly addingFloor = signal(false);
  readonly newFloorName = signal('');

  floorAbbr(name: string): string {
    if (/basement/i.test(name)) return 'B';
    if (/ground/i.test(name)) return 'G';
    if (/roof/i.test(name)) return 'R';
    const m = name.match(/\d+/);
    if (m) return m[0];
    return name.slice(0, 2).toUpperCase();
  }

  startAdd(): void {
    const n = this.floorPlan.floors().length;
    this.newFloorName.set(`Floor ${n}`);
    this.addingFloor.set(true);
  }

  confirmAdd(): void {
    const name = this.newFloorName().trim();
    if (name) this.floorPlan.addFloor(name);
    this.addingFloor.set(false);
    this.newFloorName.set('');
  }
}
