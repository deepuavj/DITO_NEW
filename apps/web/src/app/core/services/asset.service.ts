import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import type { Asset, AssetCategory } from '../models/asset.models';

export interface AssetListParams {
  page?: number;
  limit?: number;
  category?: AssetCategory;
  search?: string;
  tags?: string;
}

export interface CreateAssetDto {
  name: string;
  category: AssetCategory;
  glbUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  isPublic?: boolean;
}

export type UpdateAssetDto = Partial<CreateAssetDto>;

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly api = inject(ApiService);

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
}

