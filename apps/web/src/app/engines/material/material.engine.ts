import { Injectable, signal } from '@angular/core';
import * as THREE from 'three';

export interface MaterialDef {
  id: string;
  name: string;
  type: string;
  metadata: {
    color?: string;
    mapUrl?: string;
    roughness?: number;
    metalness?: number;
    normalMapUrl?: string;
    tileScale?: number;
  };
}

/**
 * MaterialEngine: manages material creation, caching, and swapping.
 * Maintains a cache of THREE.Material instances keyed by materialId.
 */
@Injectable({ providedIn: 'root' })
export class MaterialEngine {
  private readonly cache = new Map<string, THREE.MeshStandardMaterial>();
  private readonly _library = signal<MaterialDef[]>([]);
  readonly library = this._library.asReadonly();

  setLibrary(materials: MaterialDef[]): void {
    this._library.set(materials);
  }

  getMaterial(def: MaterialDef): THREE.MeshStandardMaterial {
    if (this.cache.has(def.id)) return this.cache.get(def.id)!;

    const mat = new THREE.MeshStandardMaterial({
      color: def.metadata.color ?? '#CCCCCC',
      roughness: def.metadata.roughness ?? 0.8,
      metalness: def.metadata.metalness ?? 0.0,
    });

    if (def.metadata.mapUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(def.metadata.mapUrl, tex => {
        const scale = def.metadata.tileScale ?? 1;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(scale, scale);
        mat.map = tex;
        mat.needsUpdate = true;
      });
    }

    this.cache.set(def.id, mat);
    return mat;
  }

  getMaterialById(id: string): THREE.MeshStandardMaterial | undefined {
    const def = this._library().find(m => m.id === id);
    return def ? this.getMaterial(def) : undefined;
  }

  dispose(): void {
    this.cache.forEach(mat => mat.dispose());
    this.cache.clear();
  }
}
