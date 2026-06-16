import { Injectable, inject, signal, computed } from '@angular/core';
import { SceneEngine } from '../../../engines/scene/scene.engine';
import { MetadataEngine } from '../../../engines/metadata/metadata.engine';
import { PropertyEngine } from '../../../engines/property/property.engine';

export type StudioMode = 'select' | 'move' | 'rotate' | 'scale';

@Injectable()
export class StudioStateService {
  private readonly sceneEngine = inject(SceneEngine);
  readonly propertyEngine = inject(PropertyEngine);

  readonly mode = signal<StudioMode>('select');
  readonly isSaving = signal(false);
  readonly isPanelOpen = signal(true);

  readonly selectedObject = this.sceneEngine.selectedObject;

  readonly activeProperties = computed(() => {
    return this.propertyEngine.getPropertiesForSelection();
  });

  setMode(mode: StudioMode): void {
    this.mode.set(mode);
  }

  applyProperty(propertyId: string, value: unknown): void {
    this.propertyEngine.applyPropertyChange(propertyId, value);
  }

  togglePanel(): void {
    this.isPanelOpen.update(v => !v);
  }
}
