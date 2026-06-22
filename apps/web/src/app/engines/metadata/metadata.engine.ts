import { Injectable } from '@angular/core';
import type { AssetMetadata, PropertyDef, EditableZone, SnapRule } from '../../core/models/asset.models';

/**
 * MetadataEngine: reads and interprets asset metadata at runtime.
 * This is the brain of DITO — no hardcoded asset knowledge anywhere.
 */
@Injectable({ providedIn: 'root' })
export class MetadataEngine {
  private readonly registry = new Map<string, AssetMetadata>();

  register(assetId: string, metadata: AssetMetadata): void {
    this.registry.set(assetId, metadata);
  }

  getMetadata(assetId: string): AssetMetadata | undefined {
    return this.registry.get(assetId);
  }

  getProperties(assetId: string): PropertyDef[] {
    return this.registry.get(assetId)?.properties ?? [];
  }

  getEditableZones(assetId: string): EditableZone[] {
    return this.registry.get(assetId)?.editableZones ?? [];
  }

  getSnapRule(assetId: string): SnapRule | undefined {
    return this.registry.get(assetId)?.snapRules;
  }

  getAiTags(assetId: string): string[] {
    return this.registry.get(assetId)?.aiTags ?? [];
  }

  getDimensions(assetId: string) {
    return this.registry.get(assetId)?.dimensions;
  }

  setGlbUrl(assetId: string, url: string): void {
    const existing = this.registry.get(assetId) ?? {} as AssetMetadata;
    this.registry.set(assetId, { ...existing, glbUrl: url } as any);
  }

  getGlbUrl(assetId: string): string | undefined {
    return (this.registry.get(assetId) as any)?.glbUrl;
  }

  clear(): void {
    this.registry.clear();
  }
}
