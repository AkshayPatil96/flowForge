import { type DynamicModule, Module } from '@nestjs/common';
import type { AppConfig } from './config.js';
import { Database } from './db/database.js';
import { HealthController } from './health.controller.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      providers: [{ provide: Database, useFactory: () => new Database(config.databaseUrl) }],
    };
  }
}
