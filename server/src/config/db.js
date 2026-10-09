import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env.js';

export const prisma = new PrismaClient({
  datasourceUrl: env.databaseUrl,
  log: isProduction ? ['error'] : ['warn', 'error'],
});

export async function connectDb() {
  await prisma.$connect();
}

export async function disconnectDb() {
  await prisma.$disconnect();
}

export async function pingDb() {
  await prisma.$queryRaw`SELECT 1`;
}
