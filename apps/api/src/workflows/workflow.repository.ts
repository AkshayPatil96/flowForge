import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { Database } from '../db/database.js';
import { DomainError } from '../domain/domain-error.js';
import type { WorkflowDefinition } from '../domain/workflow-definition.js';

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  latestVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowVersion {
  workflowId: string;
  version: number;
  definition: WorkflowDefinition;
  createdAt: Date;
}

@Injectable()
export class WorkflowRepository {
  constructor(private readonly database: Database) {}

  private get db() {
    return this.database.db;
  }

  /** Creates the workflow and its version 1 atomically. */
  async create(input: {
    name: string;
    description: string | null;
    definition: WorkflowDefinition;
  }): Promise<Workflow> {
    try {
      return await this.db.transaction().execute(async (trx) => {
        const workflow = await trx
          .insertInto('workflowDefinitions')
          .values({ name: input.name, description: input.description })
          .returningAll()
          .executeTakeFirstOrThrow();
        await trx
          .insertInto('workflowVersions')
          .values({
            workflowId: workflow.id,
            version: 1,
            definitionJson: JSON.stringify(input.definition),
          })
          .execute();
        return { ...workflow, latestVersion: 1 };
      });
    } catch (err) {
      if (isUniqueViolation(err, 'workflow_definitions_name_key')) {
        throw new DomainError(
          'WORKFLOW_NAME_TAKEN',
          `A workflow named "${input.name}" already exists.`,
        );
      }
      throw err;
    }
  }

  /** Returns undefined when the workflow does not exist. */
  async addVersion(
    workflowId: string,
    definition: WorkflowDefinition,
  ): Promise<WorkflowVersion | undefined> {
    return this.db.transaction().execute(async (trx) => {
      // Row lock serializes concurrent calls, so each one reads the max version
      // the previous one committed: numbers stay distinct and gap-free.
      const workflow = await trx
        .selectFrom('workflowDefinitions')
        .select('id')
        .where('id', '=', workflowId)
        .forUpdate()
        .executeTakeFirst();
      if (!workflow) return undefined;

      // Must be a separate statement: it takes a fresh snapshot after the lock
      // is granted, so it sees the version the previous holder committed. As a
      // subquery of the locking SELECT it would use the pre-wait snapshot and
      // reuse a number (verified by the concurrent test).
      const { max } = await trx
        .selectFrom('workflowVersions')
        .select((eb) => eb.fn.max('version').as('max'))
        .where('workflowId', '=', workflowId)
        .executeTakeFirstOrThrow();
      const row = await trx
        .insertInto('workflowVersions')
        .values({
          workflowId,
          version: (max ?? 0) + 1,
          definitionJson: JSON.stringify(definition),
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      await trx
        .updateTable('workflowDefinitions')
        .set({ updatedAt: sql<Date>`now()` })
        .where('id', '=', workflowId)
        .execute();
      return toVersion(row);
    });
  }

  async findById(id: string): Promise<Workflow | undefined> {
    return this.selectWorkflows().where('id', '=', id).executeTakeFirst();
  }

  async list(page: {
    limit: number;
    offset: number;
  }): Promise<{ items: Workflow[]; total: number }> {
    const [items, { total }] = await Promise.all([
      this.selectWorkflows()
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .limit(page.limit)
        .offset(page.offset)
        .execute(),
      this.db
        .selectFrom('workflowDefinitions')
        .select((eb) => eb.fn.countAll<string>().as('total'))
        .executeTakeFirstOrThrow(),
    ]);
    return { items, total: Number(total) };
  }

  async findVersion(workflowId: string, version: number): Promise<WorkflowVersion | undefined> {
    const row = await this.db
      .selectFrom('workflowVersions')
      .selectAll()
      .where('workflowId', '=', workflowId)
      .where('version', '=', version)
      .executeTakeFirst();
    return row && toVersion(row);
  }

  private selectWorkflows() {
    return this.db
      .selectFrom('workflowDefinitions')
      .selectAll('workflowDefinitions')
      .select((eb) =>
        eb
          .selectFrom('workflowVersions')
          .select((sub) => sub.fn.max('version').as('max'))
          .whereRef('workflowVersions.workflowId', '=', 'workflowDefinitions.id')
          .$asScalar()
          .$notNull()
          .as('latestVersion'),
      );
  }
}

function toVersion(row: {
  workflowId: string;
  version: number;
  definitionJson: WorkflowDefinition;
  createdAt: Date;
}): WorkflowVersion {
  return {
    workflowId: row.workflowId,
    version: row.version,
    definition: row.definitionJson,
    createdAt: row.createdAt,
  };
}

function isUniqueViolation(err: unknown, constraint: string): boolean {
  const e = err as { code?: unknown; constraint?: unknown } | null;
  return e?.code === '23505' && e.constraint === constraint;
}
