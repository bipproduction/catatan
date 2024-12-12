# Prisma Rate Limit

```ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "generic-pool";
import GenericPool from "generic-pool";

// Interface untuk connection pool
interface PrismaPool extends Pool<PrismaClient> {}

// Konfigurasi pool
const poolConfig = {
  max: 10, // maksimum koneksi
  min: 2,  // minimum koneksi
  acquireTimeoutMillis: 30000, // timeout untuk mendapatkan koneksi
  idleTimeoutMillis: 30000,    // timeout untuk koneksi idle
  evictionRunIntervalMillis: 1000, // interval pengecekan koneksi idle
};

// Factory untuk membuat dan menghancurkan instance Prisma
const factory = {
  create: async () => {
    const prisma = new PrismaClient();
    await prisma.$connect();
    return prisma;
  },
  destroy: async (client: PrismaClient) => {
    await client.$disconnect();
  },
};

// Buat singleton untuk pool
class PrismaPoolManager {
  private static instance: PrismaPool;

  public static getInstance(): PrismaPool {
    if (!PrismaPoolManager.instance) {
      PrismaPoolManager.instance = GenericPool.createPool<PrismaClient>(factory, poolConfig);
    }
    return PrismaPoolManager.instance;
  }
}

// Helper function untuk menggunakan pool
export async function withPrismaClient<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const pool = PrismaPoolManager.getInstance();
  const prisma = await pool.acquire();
  
  try {
    const result = await callback(prisma);
    return result;
  } finally {
    await pool.release(prisma);
  }
}

// Export pool manager
export const prismaPool = PrismaPoolManager.getInstance();

// Contoh penggunaan:
/*
await withPrismaClient(async (prisma) => {
  const users = await prisma.user.findMany();
  return users;
});
*/
```
