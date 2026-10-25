import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Database } from '../src/db/database.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const orderDefinition = {
  steps: [
    { key: 'validate-order', handler: 'validateOrder' },
    { key: 'reserve-inventory', handler: 'reserveInventory' },
    { key: 'process-payment', handler: 'processPayment', retryPolicy: { maxAttempts: 5 } },
    { key: 'send-notification', handler: 'sendNotification' },
  ],
};

// The test database is shared (e.g. by parallel CI runs), so every name is unique
// and every row this file creates is deleted afterwards.
describe.runIf(process.env.DATABASE_URL)('workflow definitions API', () => {
  let app: INestApplication<Server>;
  let database: Database;
  const createdIds: string[] = [];
  const uniqueName = (label: string) => `test-${label}-${randomUUID().slice(0, 8)}`;

  const api = () => request(app.getHttpServer());
  const createWorkflow = async (body: object) => {
    const res = await api().post('/api/v1/workflows').send(body);
    if (res.status === 201) createdIds.push(res.body.id);
    return res;
  };

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    app = await createApp({ apiPort: 0, logFormat: 'json', databaseUrl });
    await app.init();
    database = new Database(databaseUrl);
  });

  afterAll(async () => {
    if (createdIds.length) {
      await database.db
        .deleteFrom('workflowVersions')
        .where('workflowId', 'in', createdIds)
        .execute();
      await database.db.deleteFrom('workflowDefinitions').where('id', 'in', createdIds).execute();
    }
    await database.onApplicationShutdown();
    await app.close();
  });

  describe('POST /api/v1/workflows', () => {
    it('creates a workflow with version 1 and stores the normalized definition', async () => {
      const name = uniqueName('order');
      const res = await createWorkflow({
        name,
        description: 'Validate, reserve, pay, notify',
        definition: orderDefinition,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.stringMatching(UUID),
        name,
        description: 'Validate, reserve, pay, notify',
        latestVersion: 1,
        createdAt: expect.stringMatching(ISO),
        updatedAt: expect.stringMatching(ISO),
      });

      const version = await api().get(`/api/v1/workflows/${res.body.id}/versions/1`).expect(200);
      expect(version.body.workflowId).toBe(res.body.id);
      expect(version.body.version).toBe(1);
      expect(version.body.definition.steps.map((s: { key: string }) => s.key)).toEqual([
        'validate-order',
        'reserve-inventory',
        'process-payment',
        'send-notification',
      ]);
      // Defaults are applied once at creation, so later policy changes in code
      // never alter what a stored version means.
      expect(version.body.definition.steps[0]).toEqual({
        key: 'validate-order',
        handler: 'validateOrder',
        config: {},
        retryPolicy: {
          maxAttempts: 3,
          initialDelayMs: 1000,
          maxDelayMs: 60000,
          backoffMultiplier: 2,
          jitter: true,
        },
      });
      expect(version.body.definition.steps[2].retryPolicy.maxAttempts).toBe(5);
    });

    it('defaults description to null', async () => {
      const res = await createWorkflow({ name: uniqueName('nodesc'), definition: orderDefinition });
      expect(res.status).toBe(201);
      expect(res.body.description).toBeNull();
    });

    it('rejects an invalid definition with field-level details', async () => {
      const res = await createWorkflow({
        name: uniqueName('dup-keys'),
        definition: {
          steps: [
            { key: 'a', handler: 'x' },
            { key: 'a', handler: 'y' },
          ],
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details).toContainEqual({
        path: 'definition.steps.1.key',
        message: 'duplicate step key "a"',
      });
    });

    it.each([
      ['missing name', { definition: orderDefinition }],
      ['invalid name', { name: 'Not Kebab', definition: orderDefinition }],
      ['missing definition', { name: 'valid-name' }],
      ['unknown field', { name: 'valid-name', definition: orderDefinition, owner: 'me' }],
      [
        'description too long',
        { name: 'valid-name', description: 'x'.repeat(501), definition: orderDefinition },
      ],
      ['non-object body', [1, 2, 3]],
    ])('rejects %s with 400 VALIDATION_FAILED', async (_label, body) => {
      const res = await createWorkflow(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects a duplicate name with 409 WORKFLOW_NAME_TAKEN', async () => {
      const name = uniqueName('taken');
      expect((await createWorkflow({ name, definition: orderDefinition })).status).toBe(201);
      const res = await createWorkflow({ name, definition: orderDefinition });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('WORKFLOW_NAME_TAKEN');
    });
  });

  describe('versions', () => {
    it('adds version 2 without changing version 1', async () => {
      const created = await createWorkflow({ name: uniqueName('v2'), definition: orderDefinition });
      const id = created.body.id;
      const v2Definition = { steps: [{ key: 'only-step', handler: 'noop' }] };

      const res = await api()
        .post(`/api/v1/workflows/${id}/versions`)
        .send({ definition: v2Definition });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ workflowId: id, version: 2 });

      const workflow = await api().get(`/api/v1/workflows/${id}`).expect(200);
      expect(workflow.body.latestVersion).toBe(2);
      expect(Date.parse(workflow.body.updatedAt)).toBeGreaterThanOrEqual(
        Date.parse(created.body.updatedAt),
      );

      const v1 = await api().get(`/api/v1/workflows/${id}/versions/1`).expect(200);
      expect(v1.body.definition.steps).toHaveLength(4);
    });

    it('allocates distinct, gap-free version numbers under concurrent requests', async () => {
      const created = await createWorkflow({
        name: uniqueName('race'),
        definition: orderDefinition,
      });
      const id = created.body.id;

      const responses = await Promise.all(
        Array.from({ length: 5 }, () =>
          api().post(`/api/v1/workflows/${id}/versions`).send({ definition: orderDefinition }),
        ),
      );

      expect(responses.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
      const versions = responses.map((r) => r.body.version as number).sort((a, b) => a - b);
      expect(versions).toEqual([2, 3, 4, 5, 6]);
    });

    it('returns 404 when adding a version to a missing workflow', async () => {
      const res = await api()
        .post(`/api/v1/workflows/${randomUUID()}/versions`)
        .send({ definition: orderDefinition });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('validates the new version definition', async () => {
      const created = await createWorkflow({
        name: uniqueName('badv'),
        definition: orderDefinition,
      });
      const res = await api()
        .post(`/api/v1/workflows/${created.body.id}/versions`)
        .send({ definition: { steps: [] } });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('reads', () => {
    it('GET /workflows/:id returns 404 for an unknown id', async () => {
      const res = await api().get(`/api/v1/workflows/${randomUUID()}`).expect(404);
      expect(res.body.error.code).toBe('WORKFLOW_NOT_FOUND');
    });

    it('GET /workflows/:id rejects a malformed id with 400', async () => {
      const res = await api().get('/api/v1/workflows/not-a-uuid').expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('GET a missing version returns 404 WORKFLOW_VERSION_NOT_FOUND', async () => {
      const created = await createWorkflow({
        name: uniqueName('nov'),
        definition: orderDefinition,
      });
      const res = await api().get(`/api/v1/workflows/${created.body.id}/versions/99`).expect(404);
      expect(res.body.error.code).toBe('WORKFLOW_VERSION_NOT_FOUND');
    });

    it.each(['0', 'abc', '1.5'])('GET version %j is rejected with 400', async (version) => {
      const created = await createWorkflow({
        name: uniqueName('badnum'),
        definition: orderDefinition,
      });
      await api().get(`/api/v1/workflows/${created.body.id}/versions/${version}`).expect(400);
    });

    it('GET /workflows lists newest first with pagination metadata', async () => {
      const names = [uniqueName('list-a'), uniqueName('list-b'), uniqueName('list-c')];
      for (const name of names) await createWorkflow({ name, definition: orderDefinition });

      const page = await api().get('/api/v1/workflows?limit=2&offset=0').expect(200);
      expect(page.body.items).toHaveLength(2);
      expect(page.body.page).toEqual({ limit: 2, offset: 0, total: expect.any(Number) });
      expect(page.body.page.total).toBeGreaterThanOrEqual(3);

      const all = await api().get('/api/v1/workflows?limit=100').expect(200);
      const createdAts = all.body.items.map((w: { createdAt: string }) => Date.parse(w.createdAt));
      expect(createdAts).toEqual([...createdAts].sort((a, b) => b - a));
      const listed = all.body.items.map((w: { name: string }) => w.name);
      for (const name of names) expect(listed).toContain(name);
    });

    it('GET /workflows uses default pagination', async () => {
      const res = await api().get('/api/v1/workflows').expect(200);
      expect(res.body.page).toMatchObject({ limit: 20, offset: 0 });
    });

    it.each(['limit=0', 'limit=101', 'offset=-1', 'limit=abc', 'sort=name'])(
      'GET /workflows?%s is rejected with 400',
      async (query) => {
        const res = await api().get(`/api/v1/workflows?${query}`).expect(400);
        expect(res.body.error.code).toBe('VALIDATION_FAILED');
      },
    );
  });
});
