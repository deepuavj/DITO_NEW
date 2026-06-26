import { PrismaClient } from '@prisma/client';
import { config } from './index';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7 removed url from schema.prisma; pass it directly here.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev() ? ['query', 'warn', 'error'] : ['error'],
    datasourceUrl: process.env['DATABASE_URL'],
  } as ConstructorParameters<typeof PrismaClient>[0]);

if (config.isDev()) {
  globalForPrisma.prisma = prisma;
}
