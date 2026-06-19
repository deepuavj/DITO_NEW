export interface SceneObject {
  id: string;
  assetId: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialOverrides: Record<string, string>; // zoneId -> materialId
  propertyValues: Record<string, unknown>;   // propertyId -> value
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  floorMaterialId?: string;
}

export interface FloorPlanData {
  walls: import('./floor-plan.models').FPWall[];
  doors: import('./floor-plan.models').FPDoor[];
  windows: import('./floor-plan.models').FPWindow[];
  measures: import('./floor-plan.models').FPMeasure[];
}

export interface SceneData {
  room: RoomConfig;
  objects: SceneObject[];
  floorPlan?: FloorPlanData;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  lighting?: { ambientIntensity: number; sunPosition: [number, number, number] };
}

export interface Scene {
  id: string;
  userId: string;
  name: string;
  description?: string;
  sceneData: SceneData;
  thumbnail?: string;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SceneSummary {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  version: number;
  isPublic: boolean;
  updatedAt: string;
}
