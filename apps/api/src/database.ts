import { Logger, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';

// Neon may need to wake a suspended compute; allow for that, but bound it.
const CONNECTION_TIMEOUT_MS = 5_000;

export class Database implements OnApplicationShutdown {
  private readonly logger = new Logger(Database.name);
  readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    });
    // Neon drops idle connections when compute suspends. Without a listener,
    // an idle client error is an unhandled 'error' event and kills the process.
    this.pool.on('error', (err) => this.logger.warn(`Idle client error: ${err.message}`));
  }

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
