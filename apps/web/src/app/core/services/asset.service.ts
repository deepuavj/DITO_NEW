import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { Asset, Category } from '../models/asset.models';
import { environment } from '../../../environments/environment';

export interface AssetListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  tags?: string;
}

export interface CreateAssetDto {
  name: string;
  category: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
  isPublic?: boolean;
}

export type UpdateAssetDto = Partial<CreateAssetDto>;

export interface CreateCategoryDto {
  name: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly api  = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ── Assets ──────────────────────────────────────────────────────────────────

  list(params?: AssetListParams) {
    return this.api.getPaginated<Asset>('/assets', params as Record<string, string | number>);
  }

  getById(id: string) {
    return this.api.get<Asset>(`/assets/${id}`).pipe(map(r => r.data!));
  }

  create(dto: CreateAssetDto) {
    return this.api.post<Asset>('/assets', dto).pipe(map(r => r.data!));
  }

  update(id: string, dto: UpdateAssetDto) {
    return this.api.patch<Asset>(`/assets/${id}`, dto).pipe(map(r => r.data!));
  }

  remove(id: string) {
    return this.api.delete<null>(`/assets/${id}`);
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  listCategories() {
    return this.api.get<Category[]>('/categories').pipe(map(r => r.data ?? []));
  }

  createCategory(dto: CreateCategoryDto) {
    return this.api.post<Category>('/categories', dto).pipe(map(r => r.data!));
  }

  updateCategory(id: string, dto: Partial<CreateCategoryDto>) {
    return this.api.patch<Category>(`/categories/${id}`, dto).pipe(map(r => r.data!));
  }

  deleteCategory(id: string) {
    return this.api.delete<null>(`/categories/${id}`);
  }

  // ── GLB Upload ──────────────────────────────────────────────────────────────

  uploadGlb(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ success: boolean; data?: { url: string; filename: string; size: number } }>(
      `${this.base}/uploads/glb`,
      form,
    ).pipe(map(r => r.data!));
  }

  deleteGlbFile(filename: string) {
    return this.http.delete(`${this.base}/uploads/glb/${filename}`);
  }
}
