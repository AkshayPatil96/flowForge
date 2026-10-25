import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Database } from '../src/db/database.js';

// Database-level guarantees, tested directly so they hold even if application
// code has a bug. Requires DATABASE_URL (migrated by global setup).
describe.runIf(process.env.DATABASE_URL)('workflow schema constraints', () => {
  let database: Database;
  let workflowId: string;

  beforeAll(async () => {
    database = new Database(process.env.DATABASE_URL ?? '');
    const row = await database.db
      .insertInto('workflowDefinitions')
      .values({ name: `test-schema-${randomUUID()}` })
      .returning('id')
      .executeTakeFirstOrThrow();
    workflowId = row.id;
    await database.db
      .insertInto('workflowVersions')
      .values({ workflowId, version: 1, definitionJson: JSON.stringify({ steps: [] }) })
      .execute();
  });

  afterAll(async () => {
    await database.db.deleteFrom('workflowVersions').where('workflowId', '=', workflowId).execute();
    await database.db.deleteFrom('workflowDefinitions').where('id', '=', workflowId).execute();
    await database.db.destroy();
  });

  it('rejects updates to a workflow version (versions are immutable)', async () => {
    await expect(
      sql`UPDATE workflow_versions SET definition_json = '{}' WHERE workflow_id = ${workflowId}`.execute(
        database.db,
      ),
    ).rejects.toThrow(/immutable/);
  });

  it('rejects a duplicate version number for the same workflow', async () => {
    await expect(
      database.db
        .insertInto('workflowVersions')
        .values({ workflowId, version: 1, definitionJson: '{}' })
        .execute(),
    ).rejects.toMatchObject({ constraint: 'workflow_versions_workflow_id_version_key' });
  });

  it('rejects a version for a workflow that does not exist', async () => {
    await expect(
      database.db
        .insertInto('workflowVersions')
        .values({ workflowId: randomUUID(), version: 1, definitionJson: '{}' })
        .execute(),
    ).rejects.toMatchObject({ code: '23503' }); // foreign_key_violation
  });

  it('rejects version 0', async () => {
    await expect(
      database.db
        .insertInto('workflowVersions')
        .values({ workflowId, version: 0, definitionJson: '{}' })
        .execute(),
    ).rejects.toMatchObject({ code: '23514' }); // check_violation
  });

  it('rejects a duplicate workflow name', async () => {
    const name = `test-schema-dup-${randomUUID()}`;
    const first = await database.db
      .insertInto('workflowDefinitions')
      .values({ name })
      .returning('id')
      .executeTakeFirstOrThrow();
    try {
      await expect(
        database.db.insertInto('workflowDefinitions').values({ name }).execute(),
      ).rejects.toMatchObject({ constraint: 'workflow_definitions_name_key' });
    } finally {
      await database.db.deleteFrom('workflowDefinitions').where('id', '=', first.id).execute();
    }
  });
});
