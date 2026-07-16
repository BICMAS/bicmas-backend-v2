import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

async function finalFix() {
    console.log('🚀 Starting final fix...\n');

    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        // 1. Connect and reset database
        console.log('1. Resetting database...');
        await client.connect();

        // Drop all foreign keys first
        const fks = await client.query(`
            SELECT conname, conrelid::regclass as table_name
            FROM pg_constraint WHERE contype = 'f' 
            AND connamespace = 'public'::regnamespace
        `);

        for (const row of fks.rows) {
            await client.query(`ALTER TABLE ${row.table_name} DROP CONSTRAINT IF EXISTS "${row.conname}"`);
        }

        // Drop all tables
        await client.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
                LOOP
                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);

        console.log('✅ Database cleared\n');

        // 2. Clean up migrations
        console.log('2. Cleaning migration state...');
        try {
            execSync('npx prisma migrate resolve --rolled-back 20251210141603_init', { stdio: 'pipe' });
        } catch (e) {
            // Ignore if migration doesn't exist
        }

        // Remove migration folder if exists
        const migrationPath = 'prisma/migrations/20251210141603_init';
        if (fs.existsSync(migrationPath)) {
            fs.rmSync(migrationPath, { recursive: true });
        }

        // Remove all migrations
        if (fs.existsSync('prisma/migrations')) {
            const files = fs.readdirSync('prisma/migrations');
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs.rmSync(`prisma/migrations/${file}`, { recursive: true });
                }
            }
        }

        console.log('✅ Migration state cleaned\n');

        // 3. Generate and migrate
        console.log('3. Generating Prisma client...');
        execSync('npx prisma generate', { stdio: 'inherit' });

        console.log('\n4. Creating fresh migration...');
        execSync('npx prisma migrate dev --name init --skip-seed', { stdio: 'inherit' });

        console.log('\n🎉 SUCCESS! Your database is now ready.\n');
        console.log('📋 Final step: Run your seed:');
        console.log('   npm run seed');

    } catch (error) {
        console.error(' Error:', error.message);
        console.log('\n💡 Trying alternative approach...');

        // Fallback: Use db push
        execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
        console.log('\n✅ Used db push instead. Now run: npm run seed');

    } finally {
        await client.end();
    }
}

finalFix();