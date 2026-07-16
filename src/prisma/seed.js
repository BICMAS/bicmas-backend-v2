import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { prisma, pool } from '../utils/db.js';

dotenv.config();

async function seed() {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
            console.error('ADMIN_PASSWORD is required to seed the database');
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 12);

        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                userRole: 'SUPER_ADMIN',
                status: 'ACTIVE',
                authProvider: 'LOCAL',
                password: hashedPassword
            },
            create: {
                username: 'admin',
                email: adminEmail,
                fullName: 'Super Admin',
                password: hashedPassword,
                userRole: 'SUPER_ADMIN',
                status: 'ACTIVE',
                authProvider: 'LOCAL',
            },
        });

        console.log(`Super admin seeded for ${adminEmail}`);
        console.log('Seeding completed!');
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        await pool.end();
    }
}

seed();
