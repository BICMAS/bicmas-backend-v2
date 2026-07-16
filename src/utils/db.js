import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

export function createPgPoolConfig() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required');
    }

    const isRemote = /rlwy\.net|railway\.app|amazonaws\.com/i.test(connectionString);

    return {
        connectionString,
        connectionTimeoutMillis: 15_000,
        max: isRemote ? 10 : undefined,
    };
}

const pool = new Pool(createPgPoolConfig());
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
export { pool };

export const disconnectPrisma = async () => {
    await prisma.$disconnect();
    await pool.end();
};
