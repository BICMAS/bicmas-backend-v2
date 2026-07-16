import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import router from './routes/index.js';
import { validateEnv, getCorsOrigins, isProductionEnv } from './config/env.js';
import { prisma, pool } from './utils/db.js';
import { getScormUploadTimeoutMs } from './middleware/scormUploadTimeout.js';

dotenv.config();
validateEnv();

const app = express();
const port = process.env.PORT || 5000;

const corsOrigins = getCorsOrigins();
app.use(cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ limit: '200mb', extended: true }));

const defaultRequestTimeoutMs = Number(process.env.HTTP_REQUEST_TIMEOUT_MS) || 300000;
const scormUploadTimeoutMs = getScormUploadTimeoutMs();

app.use((req, res, next) => {
    req.setTimeout(defaultRequestTimeoutMs);
    res.setTimeout(defaultRequestTimeoutMs);
    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'Prime Impact LMS API',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        console.error('[HEALTH CHECK ERROR]', error);
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

app.use('/api/v1', router);

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
    const message = isProductionEnv() && statusCode >= 500
        ? 'Internal server error'
        : (err?.message || 'Internal server error');

    res.status(statusCode).json({ error: message });
});

const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port} (${process.env.NODE_ENV || 'development'})`);
});
server.keepAliveTimeout = 65000;
server.timeout = scormUploadTimeoutMs;

export default app;
