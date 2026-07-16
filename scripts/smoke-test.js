import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.SMOKE_TEST_URL || `http://localhost:${process.env.PORT || 5000}`;
let passed = 0;
let failed = 0;

async function check(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
        passed += 1;
    } catch (error) {
        console.error(`✗ ${name}: ${error.message}`);
        failed += 1;
    }
}

async function main() {
    console.log(`Running smoke tests against ${baseUrl}\n`);

    await check('health endpoint returns 200', async () => {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = await res.json();
        if (body.status !== 'ok') throw new Error('unexpected body');
    });

    await check('root endpoint returns 200', async () => {
        const res = await fetch(`${baseUrl}/`);
        if (!res.ok) throw new Error(`status ${res.status}`);
    });

    await check('SSO stub blocked in production', async () => {
        if (process.env.NODE_ENV !== 'production') {
            return;
        }
        const res = await fetch(`${baseUrl}/api/v1/auth/sso/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: 'test' }),
        });
        if (res.status === 200) throw new Error('SSO stub should not return tokens in production');
    });

    await check('SCORM callback rejects missing secret in production', async () => {
        if (process.env.NODE_ENV !== 'production') {
            return;
        }
        const res = await fetch(`${baseUrl}/api/v1/scorm-callback/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'registration_id=test&learner_id=test',
        });
        if (res.status === 200) throw new Error('unauthenticated callback should be rejected');
    });

    await check('courses require authentication', async () => {
        const res = await fetch(`${baseUrl}/api/v1/courses/`);
        if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
    });

    await check('prompts route removed', async () => {
        const res = await fetch(`${baseUrl}/prompts`);
        if (res.status !== 404) throw new Error(`expected 404, got ${res.status}`);
    });

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

main();
