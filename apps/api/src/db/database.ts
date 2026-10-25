import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import type { DB } from './schema.js';

// Neon may need to wake a suspended compute; allow for that, but bound it.
const CONNECTION_TIMEOUT_MS = 5_000;

export class Database implements OnApplicationShutdown {
  private readonly logger = new Logger(Database.name);
  readonly pool: pg.Pool;
  readonly db: Kysely<DB>;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });
    // Neon drops idle connections when compute suspends. Without a listener,
    // an idle client error is an unhandled 'error' event and kills the process.
    this.pool.on('error', (err) => this.logger.warn(`Idle client error: ${err.message}`));
    this.db = new Kysely<DB>({
      dialect: new PostgresDialect({ pool: this.pool }),
      plugins: [new CamelCasePlugin()],
    });
  }

  async ping(): Promise<void> {
    await sql`SELECT 1`.execute(this.db);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.db.destroy();
    // Kysely only ends the pool if it ever acquired a connection from it.
    if (!this.pool.ended) await this.pool.end();
  }
}
