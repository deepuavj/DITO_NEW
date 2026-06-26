// Full project metadata schema — shareable with AI for realistic image generation

export type LengthUnit = 'm' | 'cm' | 'ft' | 'in';
export type BuildingType = 'residential' | 'commercial' | 'industrial' | 'office' | 'hospitality' | 'retail';
export type ConstructionStyle = 'modern' | 'contemporary' | 'traditional' | 'minimalist' | 'industrial' | 'rustic' | 'scandinavian' | 'mediterranean' | 'colonial' | 'art-deco';
export type QualityLevel = 'draft' | 'standard' | 'high' | 'ultra';
export type LightingMode = 'studio' | 'natural' | 'evening' | 'night' | 'overcast';
export type EnvironmentPreset = 'interior' | 'exterior' | 'showroom' | 'outdoor-day' | 'outdoor-night';
export type RoomType = 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'hall' | 'dining' | 'balcony' | 'office' | 'storage' | 'custom';
export type WallMaterial = 'concrete' | 'brick' | 'wood' | 'glass' | 'metal' | 'plaster' | 'stone';

// ─── Shared metadata (common between 2D and 3D) ──────────────────────────────

export interface WallDefaults {
  thickness: number;   // mm
  height: number;      // mm
  material: WallMaterial;
  color: string;       // hex
}

export interface GridConfig {
  visible: boolean;
  spacing: number;     // in the chosen unit
  snapEnabled: boolean;
  snapThreshold: number; // pixels
}

export interface SharedMetadata {
  units: LengthUnit;
  pixelsPerUnit: number;  // 100 px/m by default
  buildingType: BuildingType;
  constructionStyle: ConstructionStyle;
  totalArea: number;       // m²
  totalFloors: number;
  currentFloor: number;
  floorHeight: number;     // mm
  wallDefaults: WallDefaults;
  grid: GridConfig;
  tags: string[];
  description: string;
}

// ─── 2D metadata ─────────────────────────────────────────────────────────────

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Metadata2D {
  viewport: CanvasViewport;
  showDimensions: boolean;
  showRoomLabels: boolean;
  showGrid: boolean;
  showRoomColors: boolean;
  snapToGrid: boolean;
  snapToWalls: boolean;
  activeTool: string;
}

// ─── 3D metadata ─────────────────────────────────────────────────────────────

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface LightingConfig {
  mode: LightingMode;
  ambientIntensity: number;
  sunIntensity: number;
  sunPosition: [number, number, number];
  shadowsEnabled: boolean;
  shadowSoftness: number;
}

export interface EnvironmentConfig {
  preset: EnvironmentPreset;
  backgroundVisible: boolean;
  groundVisible: boolean;
  fogEnabled: boolean;
  fogColor: string;
  fogNear: number;
  fogFar: number;
}

export interface RendererConfig {
  quality: QualityLevel;
  antialias: boolean;
  shadowMapSize: number;
  physicallyCorrectLights: boolean;
  toneMapping: 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces';
  toneMappingExposure: number;
}

export interface Metadata3D {
  camera: CameraState;
  lighting: LightingConfig;
  environment: EnvironmentConfig;
  renderer: RendererConfig;
  showGrid: boolean;
  showWireframe: boolean;
  showShadows: boolean;
}

// ─── Room (from 2D room detection) ───────────────────────────────────────────

export interface RoomPolygon {
  id: string;
  polygon: Array<{ x: number; y: number }>;  // 2D pixel coords
  area: number;    // m²
  centroid: { x: number; y: number };
}

export interface RoomData extends RoomPolygon {
  label: string;
  type: RoomType;
  floorColor: string;
  floorMaterialId?: string;
  ceilingHeight?: number;  // mm, overrides building default
}

// ─── Floor plan (2D elements) ────────────────────────────────────────────────

export interface Pt2D { x: number; y: number }

export interface WallData {
  id: string;
  start: Pt2D;
  end: Pt2D;
  thickness: number;   // mm
  height: number;      // mm
  material: WallMaterial;
  color: string;
}

export interface DoorData {
  id: string;
  pos: Pt2D;
  angle: number;
  wallId: string | null;
  width: number;      // mm
  height: number;     // mm
  swingDir: 'left' | 'right';
  openAngle: number;
}

export interface WindowData {
  id: string;
  pos: Pt2D;
  angle: number;
  wallId: string | null;
  width: number;     // mm
  height: number;    // mm
  sillHeight: number; // mm
}

export interface MeasureData {
  id: string;
  start: Pt2D;
  end: Pt2D;
  unit: LengthUnit;
}

export interface FloorPlanMetadata {
  walls: WallData[];
  doors: DoorData[];
  windows: WindowData[];
  measures: MeasureData[];
  rooms: RoomData[];
}

// ─── 3D scene objects ─────────────────────────────────────────────────────────

export interface SceneObjectMeta {
  id: string;
  assetId: string;
  name: string;
  category: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialOverrides: Record<string, string>;
  propertyValues: Record<string, unknown>;
  roomId?: string;   // which detected room contains this object
}

// ─── Top-level project metadata ───────────────────────────────────────────────

export interface ProjectMetadata {
  version: string;          // schema version e.g. "1.0"
  projectId: string;
  projectName: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;
  authorId?: string;
  shared: SharedMetadata;
  metadata2D: Metadata2D;
  metadata3D: Metadata3D;
  floorPlan: FloorPlanMetadata;
  objects: SceneObjectMeta[];
}

// ─── AI export payload ────────────────────────────────────────────────────────

export interface AIImageGenerationPayload {
  projectName: string;
  description: string;
  buildingType: BuildingType;
  constructionStyle: ConstructionStyle;
  rooms: Array<{
    label: string;
    type: RoomType;
    area: number;
    floorColor: string;
  }>;
  objects: Array<{
    name: string;
    category: string;
    position: [number, number, number];
    roomId?: string;
  }>;
  lighting: LightingConfig;
  environment: EnvironmentConfig;
  camera: CameraState;
  tags: string[];
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_SHARED_METADATA: SharedMetadata = {
  units: 'm',
  pixelsPerUnit: 100,
  buildingType: 'residential',
  constructionStyle: 'modern',
  totalArea: 0,
  totalFloors: 1,
  currentFloor: 1,
  floorHeight: 2800,
  wallDefaults: {
    thickness: 200,
    height: 2800,
    material: 'concrete',
    color: '#D4C8B8',
  },
  grid: {
    visible: true,
    spacing: 1,
    snapEnabled: true,
    snapThreshold: 10,
  },
  tags: [],
  description: '',
};

export const DEFAULT_METADATA_2D: Metadata2D = {
  viewport: { zoom: 1, panX: 0, panY: 0 },
  showDimensions: true,
  showRoomLabels: true,
  showGrid: true,
  showRoomColors: true,
  snapToGrid: false,
  snapToWalls: true,
  activeTool: 'select',
};

export const DEFAULT_METADATA_3D: Metadata3D = {
  camera: {
    position: [1.8, 2.5, 1.8],
    target: [3.5, 0, 3.0],
    fov: 50,
  },
  lighting: {
    mode: 'natural',
    ambientIntensity: 0.8,
    sunIntensity: 3.0,
    sunPosition: [5, 8, 5],
    shadowsEnabled: true,
    shadowSoftness: 2,
  },
  environment: {
    preset: 'interior',
    backgroundVisible: true,
    groundVisible: true,
    fogEnabled: true,
    fogColor: '#D4E9F7',
    fogNear: 30,
    fogFar: 150,
  },
  renderer: {
    quality: 'high',
    antialias: true,
    shadowMapSize: 2048,
    physicallyCorrectLights: true,
    toneMapping: 'aces',
    toneMappingExposure: 1.2,
  },
  showGrid: true,
  showWireframe: false,
  showShadows: true,
};

export function createDefaultProjectMetadata(projectId: string, projectName: string): ProjectMetadata {
  const now = new Date().toISOString();
  return {
    version: '1.0',
    projectId,
    projectName,
    createdAt: now,
    updatedAt: now,
    shared: { ...DEFAULT_SHARED_METADATA },
    metadata2D: { ...DEFAULT_METADATA_2D, viewport: { zoom: 1, panX: 0, panY: 0 } },
    metadata3D: JSON.parse(JSON.stringify(DEFAULT_METADATA_3D)),
    floorPlan: { walls: [], doors: [], windows: [], measures: [], rooms: [] },
    objects: [],
  };
}
