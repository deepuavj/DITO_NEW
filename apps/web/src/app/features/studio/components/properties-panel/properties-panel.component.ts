import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudioStateService } from '../../services/studio-state.service';

@Component({
  selector: 'dito-properties-panel',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-white border-l border-gray-200">
      <div class="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-800">
        Properties
      </div>

      @if (state.selectedObject(); as obj) {
        <div class="p-4 space-y-4 overflow-y-auto flex-1">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ obj.name }}</div>

          @for (prop of state.activeProperties(); track prop.id) {
            <div class="space-y-1">
              <label class="block text-xs font-medium text-gray-600">{{ prop.label }}</label>

              @switch (prop.type) {
                @case ('colorPicker') {
                  <input
                    type="color"
                    [value]="getPropertyValue(obj.id, prop.id)"
                    (change)="onPropertyChange(prop.id, $any($event.target).value)"
                    class="w-full h-8 rounded cursor-pointer border border-gray-200"
                  />
                }
                @case ('slider') {
                  <input
                    type="range"
                    [min]="prop.min ?? 0"
                    [max]="prop.max ?? 100"
                    [step]="prop.step ?? 1"
                    [value]="getPropertyValue(obj.id, prop.id)"
                    (input)="onPropertyChange(prop.id, +$any($event.target).value)"
                    class="w-full accent-indigo-600"
                  />
                }
                @case ('toggle') {
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      [checked]="getPropertyValue(obj.id, prop.id)"
                      (change)="onPropertyChange(prop.id, $any($event.target).checked)"
                      class="w-4 h-4 accent-indigo-600"
                    />
                    <span class="text-xs text-gray-500">Enabled</span>
                  </label>
                }
                @case ('variantSelector') {
                  <select
                    [value]="getPropertyValue(obj.id, prop.id)"
                    (change)="onPropertyChange(prop.id, $any($event.target).value)"
                    class="w-full text-sm border border-gray-200 rounded-md p-1.5"
                  >
                    @for (opt of prop.options; track opt.value) {
                      <option [value]="opt.value">{{ opt.label }}</option>
                    }
                  </select>
                }
                @default {
                  <span class="text-xs text-gray-400 italic">{{ prop.type }}</span>
                }
              }
            </div>
          }

          @if (state.activeProperties().length === 0) {
            <p class="text-xs text-gray-400 italic">No configurable properties</p>
          }
        </div>
      } @else {
        <div class="flex-1 flex items-center justify-center">
          <p class="text-sm text-gray-400">Select an object to edit its properties</p>
        </div>
      }
    </div>
  `,
})
export class PropertiesPanelComponent {
  readonly state = inject(StudioStateService);

  getPropertyValue(objectId: string, propertyId: string): unknown {
    const obj = this.state.selectedObject();
    return obj?.propertyValues[propertyId] ?? null;
  }

  onPropertyChange(propertyId: string, value: unknown): void {
    this.state.applyProperty(propertyId, value);
  }
}
