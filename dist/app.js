"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = _interopRequireDefault(require("express"));
var _dotenv = _interopRequireDefault(require("dotenv"));
var _pg = require("pg");
var _adapterPg = require("@prisma/adapter-pg");
var _client = require("@prisma/client");
var _cors = _interopRequireDefault(require("cors"));
var _index = _interopRequireDefault(require("./routes/index.js"));
var _env = require("./config/env.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
_dotenv.default.config();
(0, _env.validateEnv)();
const app = (0, _express.default)();
const port = process.env.PORT || 5000;
const pool = new _pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new _adapterPg.PrismaPg(pool);
const prisma = new _client.PrismaClient({
  adapter
});
const corsOrigins = (0, _env.getCorsOrigins)();
app.use((0, _cors.default)({
  origin: corsOrigins.length > 0 ? corsOrigins : false,
  credentials: true
}));
app.use(_express.default.json());
app.use(_express.default.urlencoded({
  limit: '200mb',
  extended: true
}));
app.use((req, res, next) => {
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});
app.get('/', (req, res) => {
  res.json({
    message: 'Prime Impact LMS API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[HEALTH CHECK ERROR]', error);
    res.status(503).json({
      status: 'error',
      database: 'disconnected'
    });
  }
});
app.use('/api/v1', _index.default);
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
app.use((err, req, res, next) => {
  console.error('[GLOBAL ERROR HANDLER]', err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err?.statusCode || 500;
  const message = (0, _env.isProductionEnv)() && statusCode >= 500 ? 'Internal server error' : err?.message || 'Internal server error';
  res.status(statusCode).json({
    error: message
  });
});
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port} (${process.env.NODE_ENV || 'development'})`);
});
server.keepAliveTimeout = 65000;
server.timeout = 300000;
var _default = exports.default = app;