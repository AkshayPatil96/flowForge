import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Database } from './db/database.js';

@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly db: Database) {}

  // Process liveness only: must not depend on the database.
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.db.ping();
    } catch (err) {
      // Details go to logs only; clients get a generic status.
      this.logger.warn(`Database not ready: ${err instanceof Error ? err.message : String(err)}`);
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    return { status: 'ok' };
  }
}
