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

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly api = inject(ApiService);

  list(params?: AssetListParams) {
    return this.api.getPaginated<Asset>('/assets', params as Record<string, string | number>);
  }

  getById(id: string) {
    return this.api.get<Asset>(`/assets/${id}`).pipe(map(r => r.data!));
  }
}
