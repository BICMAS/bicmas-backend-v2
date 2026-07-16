"use strict";

var _client = require("@prisma/client");
var _pg = require("pg");
var _adapterPg = require("@prisma/adapter-pg");
var _dotenv = _interopRequireDefault(require("dotenv"));
var _bcryptjs = _interopRequireDefault(require("bcryptjs"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
_dotenv.default.config();
const pool = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new _adapterPg.PrismaPg(pool);
const prisma = new _client.PrismaClient({
  adapter
});
async function seed() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD is required to seed the database');
      process.exit(1);
    }
    const hashedPassword = await _bcryptjs.default.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: {
        email: adminEmail
      },
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
        authProvider: 'LOCAL'
      }
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