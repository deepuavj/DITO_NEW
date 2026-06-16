import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudioStateService, StudioMode } from '../../services/studio-state.service';

@Component({
  selector: 'dito-studio-toolbar',
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      <div class="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        @for (tool of tools; track tool.mode) {
          <button
            (click)="setMode(tool.mode)"
            [class.bg-white]="state.mode() === tool.mode"
            [class.shadow-sm]="state.mode() === tool.mode"
            [title]="tool.label"
            class="px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 transition-all"
          >{{ tool.icon }} {{ tool.label }}</button>
        }
      </div>

      <div class="h-5 w-px bg-gray-200 mx-1"></div>

      <button
        (click)="saveClicked.emit()"
        [disabled]="state.isSaving()"
        class="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
      >
        {{ state.isSaving() ? 'Saving…' : 'Save' }}
      </button>

      <button
        (click)="renderClicked.emit()"
        class="px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
      >
        ✨ Render
      </button>

      <div class="ml-auto text-xs text-gray-400">
        {{ state.selectedObject()?.name ?? 'Nothing selected' }}
      </div>
    </div>
  `,
})
export class StudioToolbarComponent {
  readonly state = inject(StudioStateService);
  readonly saveClicked = output();
  readonly renderClicked = output();

  readonly tools: { mode: StudioMode; label: string; icon: string }[] = [
    { mode: 'select', label: 'Select', icon: '↖' },
    { mode: 'move',   label: 'Move',   icon: '↔' },
    { mode: 'rotate', label: 'Rotate', icon: '↻' },
    { mode: 'scale',  label: 'Scale',  icon: '⊞' },
  ];

  setMode(mode: StudioMode): void {
    this.state.setMode(mode);
  }
}
