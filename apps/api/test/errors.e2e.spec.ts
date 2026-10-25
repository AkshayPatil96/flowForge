import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const UUID = /^[0-9a-f-]{36}$/;

describe('error responses and request IDs', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await createApp({ apiPort: 0, databaseUrl: 'postgresql://u:p@127.0.0.1:1/x' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('unknown route: standard error body with a generated request ID', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Cannot GET /api/v1/nope' },
      requestId: expect.stringMatching(UUID),
    });
    expect(res.headers['x-request-id']).toBe(res.body.requestId);
  });

  it('echoes a safe caller-supplied X-Request-Id', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set('X-Request-Id', 'client-abc.123')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('client-abc.123');
  });

  it.each([
    ['with spaces', 'has spaces'],
    ['too long', 'a'.repeat(129)],
  ])('replaces an unsafe caller X-Request-Id (%s)', async (_label, value) => {
    const res = await request(app.getHttpServer()).get('/health').set('X-Request-Id', value);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('oversized body: 413 PAYLOAD_TOO_LARGE with a request ID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/nope')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 'a'.repeat(200_000) }))
      .expect(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(res.body.requestId).toMatch(UUID);
  });

  it('malformed JSON: 400 BAD_REQUEST', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/nope')
      .set('Content-Type', 'application/json')
      .send('{"broken":')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('readiness failure uses the standard body', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(503);
    expect(res.body.error).toEqual({
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database is not reachable.',
    });
  });
});
