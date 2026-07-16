#!/usr/bin/env node
/**
 * Apply database schema and seed admin user.
 * Run from prime-impact-backend: node scripts/deploy-db.js
 */
import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is required for seeding');
    process.exit(1);
}

console.log('Applying database schema...');
try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} catch {
    console.log('migrate deploy failed, trying db push...');
    execSync('npx prisma db push', { stdio: 'inherit' });
}

console.log('Seeding admin user...');
execSync('npm run seed', { stdio: 'inherit' });
console.log('Database deploy complete.');
