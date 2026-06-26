import { z } from 'zod';

export const createAssetSchema = z.object({
  name:         z.string().min(2).max(200),
  category:     z.string().min(1).max(100),       // free-text, matches Category.name
  glbUrl:       z.string().url().optional().default(''),
  thumbnailUrl: z.string().url().optional(),
  metadata:     z.record(z.string(), z.unknown()).optional().default({}),
  tags:         z.array(z.string()).optional().default([]),
  isPublic:     z.boolean().optional().default(true),
});

export const updateAssetSchema = createAssetSchema.partial();

export const assetQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(500).default(20),
  category: z.string().optional(),
  search:   z.string().optional(),
  tags:     z.string().optional(),
});

export type CreateAssetDto = z.infer<typeof createAssetSchema>;
export type UpdateAssetDto = z.infer<typeof updateAssetSchema>;
export type AssetQuery     = z.infer<typeof assetQuerySchema>;
