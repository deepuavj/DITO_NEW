import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { CreateSceneDto, UpdateSceneDto, SceneQuery } from './scene.validator';
import type { Prisma } from '@prisma/client';

type JsonValue = Prisma.InputJsonValue;

export const sceneService = {
  async listForUser(userId: string, query: SceneQuery) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const [scenes, total] = await prisma.$transaction([
      prisma.scene.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, description: true, thumbnail: true, version: true, isPublic: true, updatedAt: true },
      }),
      prisma.scene.count({ where: { userId } }),
    ]);

    return { scenes, total };
  },

  async getById(id: string, userId: string) {
    const scene = await prisma.scene.findUnique({ where: { id } });
    if (!scene) throw new AppError('Scene not found', 404);
    if (!scene.isPublic && scene.userId !== userId) throw new AppError('Forbidden', 403);
    return scene;
  },

  async create(userId: string, dto: CreateSceneDto) {
    const { sceneData, ...rest } = dto;
    return prisma.scene.create({
      data: { userId, ...rest, sceneData: (sceneData ?? {}) as JsonValue },
    });
  },

  async update(id: string, userId: string, dto: UpdateSceneDto) {
    const scene = await prisma.scene.findUnique({ where: { id } });
    if (!scene) throw new AppError('Scene not found', 404);
    if (scene.userId !== userId) throw new AppError('Forbidden', 403);

    const { sceneData, ...rest } = dto;
    return prisma.scene.update({
      where: { id },
      data: {
        ...rest,
        ...(sceneData !== undefined && { sceneData: sceneData as JsonValue }),
        version: { increment: 1 },
      },
    });
  },

  async delete(id: string, userId: string) {
    const scene = await prisma.scene.findUnique({ where: { id } });
    if (!scene) throw new AppError('Scene not found', 404);
    if (scene.userId !== userId) throw new AppError('Forbidden', 403);
    await prisma.scene.delete({ where: { id } });
  },
};
