import { PrismaClient } from '@prisma/client';
import { config } from './index';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev() ? ['query', 'warn', 'error'] : ['error'],
  });

if (config.isDev()) {
  globalForPrisma.prisma = prisma;
}
