import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /health', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok outside the versioned API prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });

  it('is not duplicated under /api/v1', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(404);
  });
});
