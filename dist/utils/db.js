"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prisma = exports.disconnectPrisma = void 0;
var _client = require("@prisma/client");
var _pg = require("pg");
var _adapterPg = require("@prisma/adapter-pg");
var _dotenv = _interopRequireDefault(require("dotenv"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
_dotenv.default.config();
const pool = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new _adapterPg.PrismaPg(pool);
const prisma = exports.prisma = new _client.PrismaClient({
  adapter
});
const disconnectPrisma = async () => {
  await prisma.$disconnect();
};
exports.disconnectPrisma = disconnectPrisma;