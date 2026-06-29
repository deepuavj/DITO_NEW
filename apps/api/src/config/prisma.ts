import { PrismaClient } from '@prisma/client';
import { config } from './index';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev() ? ['warn', 'error'] : ['error'],
    datasourceUrl: config.db.url,
  });

if (config.isDev()) {
  globalForPrisma.prisma = prisma;
}
