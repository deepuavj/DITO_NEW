import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

export const categoryService = {
  async list() {
    return prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  },

  async create(data: { name: string; icon?: string; color?: string; sortOrder?: number }) {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) throw new AppError('Category name already exists', 409);
    return prisma.category.create({ data });
  },

  async update(id: string, data: { name?: string; icon?: string; color?: string; sortOrder?: number }) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError('Category not found', 404);
    return prisma.category.update({ where: { id }, data });
  },

  async delete(id: string) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError('Category not found', 404);
    // Nullify assets in this category (set to 'Uncategorised')
    await prisma.asset.updateMany({ where: { category: cat.name }, data: { category: 'Uncategorised' } });
    await prisma.category.delete({ where: { id } });
  },
};
