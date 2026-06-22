import { Injectable, signal, computed } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import type { SceneObject, SceneData, RoomConfig } from '../../core/models/scene.models';

/**
 * SceneEngine: manages the scene graph — objects, transforms, selection.
 * Pure data layer — no Three.js here. Three.js reads from this engine.
 */
@Injectable({ providedIn: 'root' })
export class SceneEngine {
  private readonly _objects = signal<SceneObject[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _room = signal<RoomConfig>({
    width: 6,
    depth: 5,
    height: 2.8,
    wallColor: '#F5F5F0',
  });

  readonly objects = this._objects.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly room = this._room.asReadonly();

  readonly selectedObject = computed(() => {
    const id = this._selectedId();
    return id ? this._objects().find(o => o.id === id) ?? null : null;
  });

  addObject(assetId: string, assetName: string, position: [number, number, number] = [0, 0, 0]): SceneObject {
    const obj: SceneObject = {
      id: uuidv4(),
      assetId,
      name: assetName,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      materialOverrides: {},
      propertyValues: {},
    };
    this._objects.update(objs => [...objs, obj]);
    return obj;
  }

  removeObject(id: string): void {
    this._objects.update(objs => objs.filter(o => o.id !== id));
    if (this._selectedId() === id) this._selectedId.set(null);
  }

  updateObject(id: string, patch: Partial<Omit<SceneObject, 'id' | 'assetId'>>): void {
    this._objects.update(objs =>
      objs.map(o => (o.id === id ? { ...o, ...patch } : o)),
    );
  }

  setMaterialOverride(objectId: string, zoneId: string, materialId: string): void {
    this._objects.update(objs =>
      objs.map(o =>
        o.id === objectId
          ? { ...o, materialOverrides: { ...o.materialOverrides, [zoneId]: materialId } }
          : o,
      ),
    );
  }

  select(id: string | null): void {
    this._selectedId.set(id);
  }

  updateRoom(patch: Partial<RoomConfig>): void {
    this._room.update(r => ({ ...r, ...patch }));
  }

  loadSceneData(data: SceneData): void {
    this._room.set(data.room);
    this._objects.set(data.objects ?? []);
  }

  serialize(): SceneData {
    return {
      room: this._room(),
      objects: this._objects(),
    };
  }

  clear(): void {
    this._objects.set([]);
    this._selectedId.set(null);
  }
}
