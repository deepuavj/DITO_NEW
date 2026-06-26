export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

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

// Flexible metadata — matches the examples provided
export interface AssetMetadata {
  type?: string;                // 'sofa' | 'chair' | 'bed' | 'wardrobe' | ...
  style?: string;
  dimensions?: { width: number; height: number; depth: number };
  material?: Record<string, string>;
  colors?: Record<string, string>;
  appearance?: Record<string, string>;
  finish?: string;
  doors?: number;
  doorType?: string;
  seats?: number;
  size?: string;
  // DITO engine fields
  editableZones?: EditableZone[];
  properties?: PropertyDef[];
  snapRules?: SnapRule;
  aiTags?: string[];
  [key: string]: unknown;
}

export interface Asset {
  id: string;
  name: string;
  category: string;          // free-text matching Category.name
  glbUrl: string;
  thumbnailUrl?: string;
  metadata: AssetMetadata;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
