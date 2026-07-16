# Prime Impact LMS Backend

Express + Prisma API for the Prime Impact LMS platform.

## Setup

```bash
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, SCORM_CALLBACK_SECRET, etc.
npm install
node scripts/deploy-db.js
npm run dev
```

## Production deploy

1. Set `NODE_ENV=production` on your host (Railway, etc.)
2. Set `CORS_ORIGINS` to your frontend URLs (comma-separated)
3. Set `SCORM_CALLBACK_SECRET` and configure SCORM Cloud webhook header `X-Scorm-Callback-Secret`
4. Run `node scripts/deploy-db.js` once to apply schema and seed admin
5. Start with `npm start`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npm run build` | Compile to `dist/` |
| `npm run seed` | Seed super admin (requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| `npm run test:smoke` | Run smoke tests (set `SMOKE_TEST_URL` if not localhost:5000) |
| `node scripts/deploy-db.js` | Apply migrations + seed |

## Object storage (Tigris / S3-compatible)

Uploads (course images, field tasks, certificates) use S3-compatible storage via `@aws-sdk/client-s3`.

Required env vars:

```
AWS_ENDPOINT_URL=https://t3.storageapi.dev
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_REGION=auto
```

Files are stored privately. API responses return **presigned URLs** (7-day expiry) for images/media. Legacy Vercel Blob URLs in the database continue to work until migrated.
