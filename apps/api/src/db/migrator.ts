import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { type Kysely, sql } from 'kysely';
import { type Migration, Migrator } from 'kysely/migration';

// Same relative location from src/db and dist/db: apps/api/migrations.
const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

// Plain .sql files, applied in filename order. No down migrations.
async function loadSqlMigrations(): Promise<Record<string, Migration>> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
  const migrations: Record<string, Migration> = {};
  for (const file of files) {
    const text = await readFile(MIGRATIONS_DIR + file, 'utf8');
    migrations[file.replace(/\.sql$/, '')] = {
      up: async (db) => {
        await sql.raw(text).execute(db);
      },
    };
  }
  return migrations;
}

/**
 * Applies pending migrations in one transaction under a Postgres advisory lock,
 * so concurrent runs (parallel CI jobs, several deploys) are serialized.
 * Returns the names of the migrations applied by this call.
 */
export async function migrateToLatest<T>(db: Kysely<T>): Promise<string[]> {
  const migrator = new Migrator({
    db,
    provider: { getMigrations: loadSqlMigrations },
  });
  const { error, results = [] } = await migrator.migrateToLatest();
  if (error) {
    const failed = results.find((r) => r.status === 'Error')?.migrationName ?? 'unknown';
    throw new Error(`Migration ${failed} failed`, { cause: error });
  }
  return results.map((r) => r.migrationName);
}
