import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { CreateAssetDto, UpdateAssetDto, AssetQuery } from './asset.validator';
import type { AssetCategory, Prisma } from '@prisma/client';

export const assetService = {
  async list(query: AssetQuery) {
    const { page, limit, category, search, tags } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {
      isPublic: true,
      ...(category && { category: category as AssetCategory }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
      ...(tags && {
        tags: { hasSome: tags.split(',').map((t) => t.trim()) },
      }),
    };

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.asset.count({ where }),
    ]);

    return { assets, total };
  },

  async getById(id: string) {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new AppError('Asset not found', 404);
    return asset;
  },

  async create(dto: CreateAssetDto) {
    return prisma.asset.create({ data: { ...dto, metadata: dto.metadata as Prisma.InputJsonValue } });
  },

  async update(id: string, dto: UpdateAssetDto) {
    await this.getById(id);
    return prisma.asset.update({
      where: { id },
      data: { ...dto, ...(dto.metadata && { metadata: dto.metadata as Prisma.InputJsonValue }) },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    await prisma.asset.delete({ where: { id } });
  },
};
