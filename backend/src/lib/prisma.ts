import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// En local: si el dominio (DATABASE_URL) no resuelve, usar DIRECT_URL (IP Tailscale)
const connectionString =
  process.env.NODE_ENV === 'development' && process.env.USE_DIRECT_URL === 'true'
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL (o DIRECT_URL si USE_DIRECT_URL=true) es requerido');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
