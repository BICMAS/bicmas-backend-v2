// test-db.js
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

async function testDb() {
    console.log('🧪 Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@'));

    try {
        // 1. Test direct PostgreSQL connection
        console.log('\n1. Testing PostgreSQL connection...');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            connectionTimeoutMillis: 5000
        });

        const client = await pool.connect();
        console.log('✅ Direct PostgreSQL: Connected');
        await client.query('SELECT 1 as test');
        console.log('✅ Direct PostgreSQL: Query works');
        client.release();
        await pool.end();

        // 2. Test Prisma connection
        console.log('\n2. Testing Prisma connection...');
        const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool2);
        const prisma = new PrismaClient({ adapter });

        await prisma.$connect();
        console.log('✅ Prisma: Connected');

        // Try to count users
        const count = await prisma.user.count();
        console.log(`✅ Prisma: User count = ${count}`);

        // Try to create a test scormPackage
        console.log('\n3. Testing ScormPackage creation...');
        const testPackage = await prisma.scormPackage.create({
            data: {
                filename: 'test.zip',
                storagePath: '/test/path',
                manifestJson: {},
                scormVersion: 'V1_2',
                checksum: 'testchecksum123',
                uploadedBy: 'cmja6xxcf0001nsuivd829870' // From your logs
            }
        });
        console.log('✅ Prisma: Created test package:', testPackage.id);

        // Clean up
        await prisma.scormPackage.delete({ where: { id: testPackage.id } });
        console.log('✅ Cleaned up test record');

        await prisma.$disconnect();
        console.log('\n🎉 ALL TESTS PASSED! Database is working correctly.');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('Error code:', error.code);
        console.error('Stack:', error.stack);

        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 PostgreSQL is not running. Start it with:');
            console.log('   net start postgresql');
        } else if (error.code === '28P01') {
            console.log('\n💡 Wrong username/password in DATABASE_URL');
        } else if (error.message.includes('ECONNRESET')) {
            console.log('\n💡 Connection reset - check:');
            console.log('   1. Is PostgreSQL running?');
            console.log('   2. Firewall blocking port 5432?');
            console.log('   3. Too many connections?');
        } else if (error.message.includes('prisma')) {
            console.log('\n💡 Prisma error - run: npx prisma generate');
        }
    }
}

testDb();