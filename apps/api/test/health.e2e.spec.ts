import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Database } from '../src/db/database.js';

// Port 1 refuses connections immediately, so /ready fails fast without a database.
const UNREACHABLE_DB = 'postgresql://user:pass@127.0.0.1:1/flowforge';

describe('health endpoints without a reachable database', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp({ apiPort: 0, databaseUrl: UNREACHABLE_DB });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is ok (liveness ignores the database)', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('GET /ready is 503 without connection details', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(503);
    expect(JSON.stringify(res.body)).not.toContain('127.0.0.1');
  });

  it('operational endpoints are not duplicated under /api/v1', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });
});

describe('shutdown', () => {
  it('closes the database pool when the app closes', async () => {
    const app = await createApp({ apiPort: 0, databaseUrl: UNREACHABLE_DB });
    await app.init();
    const db = app.get(Database);
    await app.close();
    expect(db.pool.ended).toBe(true);
  });
});

// Runs only when DATABASE_URL is set (repo-root .env locally, a secret in CI).
describe.runIf(process.env.DATABASE_URL)('health endpoints with the real database', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp({ apiPort: 0, databaseUrl: process.env.DATABASE_URL ?? '' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ready is ok', async () => {
    await request(app.getHttpServer()).get('/ready').expect(200, { status: 'ok' });
  });
});
