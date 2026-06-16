import { z } from 'zod';

export const createSceneSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  sceneData: z.record(z.unknown()).optional().default({}),
  isPublic: z.boolean().optional().default(false),
});

export const updateSceneSchema = createSceneSchema.partial();

export const sceneQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateSceneDto = z.infer<typeof createSceneSchema>;
export type UpdateSceneDto = z.infer<typeof updateSceneSchema>;
export type SceneQuery = z.infer<typeof sceneQuerySchema>;
