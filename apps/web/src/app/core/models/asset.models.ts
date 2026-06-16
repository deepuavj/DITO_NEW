export type AssetCategory =
  | 'SOFA' | 'CHAIR' | 'TABLE' | 'BED' | 'STORAGE'
  | 'LIGHTING' | 'DECOR' | 'WALL' | 'FLOOR' | 'CEILING' | 'ROOM' | 'OTHER';

export interface EditableZone {
  id: string;
  label: string;
  targetMeshes: string[];
  allowedMaterialTypes: string[];
}

export interface PropertyDef {
  id: string;
  label: string;
  type: 'colorPicker' | 'materialSelector' | 'slider' | 'toggle' | 'variantSelector';
  zoneId?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface SnapRule {
  surface: 'floor' | 'wall' | 'ceiling' | 'surface';
  alignToGrid?: boolean;
  gridSize?: number;
}

export interface AssetMetadata {
  editableZones?: EditableZone[];
  properties?: PropertyDef[];
  snapRules?: SnapRule;
  aiTags?: string[];
  dimensions?: { width: number; height: number; depth: number };
  [key: string]: unknown;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  glbUrl: string;
  thumbnailUrl?: string;
  metadata: AssetMetadata;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
