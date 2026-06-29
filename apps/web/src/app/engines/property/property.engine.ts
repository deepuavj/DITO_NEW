import { Injectable, inject } from '@angular/core';
import { MetadataEngine } from '../metadata/metadata.engine';
import { SceneEngine } from '../scene/scene.engine';
import { MaterialEngine } from '../material/material.engine';
import type { PropertyDef } from '../../core/models/asset.models';

/**
 * PropertyEngine: generates the dynamic property panel for any selected object.
 * Reads metadata → produces property definitions → applies changes back to scene.
 */
@Injectable({ providedIn: 'root' })
export class PropertyEngine {
  private readonly metadata = inject(MetadataEngine);
  private readonly scene = inject(SceneEngine);
  private readonly materials = inject(MaterialEngine);

  getPropertiesForSelection(): PropertyDef[] {
    const obj = this.scene.selectedObject();
    if (!obj) return [];
    return this.metadata.getProperties(obj.assetId);
  }

  applyPropertyChange(propertyId: string, value: unknown): void {
    const obj = this.scene.selectedObject();
    if (!obj) return;

    const props = this.metadata.getProperties(obj.assetId);
    const def = props.find(p => p.id === propertyId);
    if (!def) return;

    if (def.type === 'materialSelector' && def.zoneId && typeof value === 'string') {
      this.scene.setMaterialOverride(obj.id, def.zoneId, value);
    } else {
      this.scene.updateObject(obj.id, {
        propertyValues: { ...obj.propertyValues, [propertyId]: value },
      });
    }
  }
}
