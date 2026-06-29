import { Injectable, inject, signal, computed } from '@angular/core';
import { FloorPlanService } from './floor-plan.service';
import { SceneEngine } from '../../../engines/scene/scene.engine';
import type {
  ProjectMetadata, SharedMetadata, Metadata2D, Metadata3D,
  AIImageGenerationPayload, RoomData, SceneObjectMeta,
  BuildingType, ConstructionStyle,
} from '../../../core/models/project-metadata.models';
import {
  DEFAULT_SHARED_METADATA, DEFAULT_METADATA_2D, DEFAULT_METADATA_3D,
  createDefaultProjectMetadata,
} from '../../../core/models/project-metadata.models';

@Injectable()
export class ProjectMetadataService {
  private readonly floorPlan = inject(FloorPlanService);
  private readonly sceneEngine = inject(SceneEngine);

  // Project-level identity
  readonly projectId = signal<string>('');
  readonly projectName = signal<string>('Untitled Project');

  // Shared metadata signals
  readonly buildingType = signal<BuildingType>(DEFAULT_SHARED_METADATA.buildingType);
  readonly constructionStyle = signal<ConstructionStyle>(DEFAULT_SHARED_METADATA.constructionStyle);
  readonly projectDescription = signal<string>('');
  readonly projectTags = signal<string[]>([]);
  readonly totalFloors = signal<number>(1);
  readonly currentFloor = signal<number>(1);

  // 3D camera / lighting / environment persisted across sessions
  readonly savedCamera = signal(DEFAULT_METADATA_3D.camera);
  readonly lightingConfig = signal(DEFAULT_METADATA_3D.lighting);
  readonly environmentConfig = signal(DEFAULT_METADATA_3D.environment);
  readonly rendererConfig = signal(DEFAULT_METADATA_3D.renderer);

  // 2D viewport state
  readonly viewport2D = signal(DEFAULT_METADATA_2D.viewport);

  /** Aggregate full project metadata for save/export */
  readonly fullMetadata = computed((): ProjectMetadata => {
    const now = new Date().toISOString();
    const rooms: RoomData[] = this.floorPlan.rooms().map(r => ({
      id: r.id,
      polygon: r.polygon,
      area: r.area,
      centroid: r.centroid,
      label: r.label,
      type: r.type,
      floorColor: r.floorColor,
    }));

    const objects: SceneObjectMeta[] = this.sceneEngine.objects().map(o => ({
      id: o.id,
      assetId: o.assetId,
      name: o.name,
      category: '',
      position: o.position,
      rotation: o.rotation,
      scale: o.scale,
      materialOverrides: o.materialOverrides,
      propertyValues: o.propertyValues,
    }));

    const walls = this.floorPlan.walls().map(w => ({
      id: w.id, start: w.start, end: w.end,
      thickness: w.meta.thickness, height: w.meta.height,
      material: w.meta.material as import('../../../core/models/project-metadata.models').WallMaterial,
      color: w.meta.color,
    }));
    const doors = this.floorPlan.doors().map(d => ({
      id: d.id, pos: d.pos, angle: d.angle, wallId: d.wallId,
      width: d.meta.width, height: d.meta.height,
      swingDir: d.meta.swingDir, openAngle: d.meta.openAngle,
    }));
    const windows = this.floorPlan.windows().map(w => ({
      id: w.id, pos: w.pos, angle: w.angle, wallId: w.wallId,
      width: w.meta.width, height: w.meta.height, sillHeight: w.meta.sillH,
    }));
    const measures = this.floorPlan.measures().map(m => ({
      id: m.id, start: m.start, end: m.end, unit: m.meta.unit,
    }));

    const shared: SharedMetadata = {
      ...DEFAULT_SHARED_METADATA,
      buildingType: this.buildingType(),
      constructionStyle: this.constructionStyle(),
      description: this.projectDescription(),
      tags: this.projectTags(),
      totalFloors: this.totalFloors(),
      currentFloor: this.currentFloor(),
      totalArea: rooms.reduce((s, r) => s + r.area, 0),
    };

    const metadata2D: Metadata2D = {
      ...DEFAULT_METADATA_2D,
      viewport: this.viewport2D(),
    };

    const metadata3D: Metadata3D = {
      camera: this.savedCamera(),
      lighting: this.lightingConfig(),
      environment: this.environmentConfig(),
      renderer: this.rendererConfig(),
      showGrid: true,
      showWireframe: false,
      showShadows: true,
    };

    return {
      version: '1.0',
      projectId: this.projectId(),
      projectName: this.projectName(),
      createdAt: now,
      updatedAt: now,
      shared,
      metadata2D,
      metadata3D,
      floorPlan: { walls, doors, windows, measures, rooms },
      objects,
    };
  });

  /** Export minimal payload for AI image generation */
  buildAIPayload(): AIImageGenerationPayload {
    const meta = this.fullMetadata();
    return {
      projectName: meta.projectName,
      description: meta.shared.description,
      buildingType: meta.shared.buildingType,
      constructionStyle: meta.shared.constructionStyle,
      rooms: meta.floorPlan.rooms.map(r => ({
        label: r.label,
        type: r.type,
        area: r.area,
        floorColor: r.floorColor,
      })),
      objects: meta.objects.map(o => ({
        name: o.name,
        category: o.category,
        position: o.position,
        roomId: o.roomId,
      })),
      lighting: meta.metadata3D.lighting,
      environment: meta.metadata3D.environment,
      camera: meta.metadata3D.camera,
      tags: meta.shared.tags,
    };
  }

  /** Load metadata into signals (called after fetching a scene from API) */
  loadFromMetadata(m: ProjectMetadata): void {
    this.projectId.set(m.projectId);
    this.projectName.set(m.projectName);
    this.buildingType.set(m.shared.buildingType);
    this.constructionStyle.set(m.shared.constructionStyle);
    this.projectDescription.set(m.shared.description);
    this.projectTags.set(m.shared.tags);
    this.totalFloors.set(m.shared.totalFloors);
    this.currentFloor.set(m.shared.currentFloor);
    this.savedCamera.set(m.metadata3D.camera);
    this.lightingConfig.set(m.metadata3D.lighting);
    this.environmentConfig.set(m.metadata3D.environment);
    this.rendererConfig.set(m.metadata3D.renderer);
    this.viewport2D.set(m.metadata2D.viewport);
  }

  /** Reset to defaults (new project) */
  reset(projectId: string, projectName: string): void {
    const blank = createDefaultProjectMetadata(projectId, projectName);
    this.loadFromMetadata(blank);
  }
}
