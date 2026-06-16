import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { Scene, SceneSummary, SceneData } from '../models/scene.models';

@Injectable({ providedIn: 'root' })
export class SceneService {
  private readonly api = inject(ApiService);

  list(page = 1, limit = 10) {
    return this.api.getPaginated<SceneSummary>('/scenes', { page, limit });
  }

  getById(id: string) {
    return this.api.get<Scene>(`/scenes/${id}`).pipe(map(r => r.data!));
  }

  create(name: string, description?: string) {
    return this.api.post<Scene>('/scenes', { name, description }).pipe(map(r => r.data!));
  }

  save(id: string, sceneData: SceneData, name?: string) {
    return this.api.patch<Scene>(`/scenes/${id}`, { sceneData, name }).pipe(map(r => r.data!));
  }

  delete(id: string) {
    return this.api.delete(`/scenes/${id}`);
  }
}
