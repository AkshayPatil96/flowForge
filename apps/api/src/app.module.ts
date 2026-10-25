import { type DynamicModule, Module } from '@nestjs/common';
import type { AppConfig } from './config.js';
import { Database } from './db/database.js';
import { HealthController } from './health.controller.js';
import { WorkflowRepository } from './workflows/workflow.repository.js';
import { WorkflowsController } from './workflows/workflows.controller.js';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, WorkflowsController],
      providers: [
        { provide: Database, useFactory: () => new Database(config.databaseUrl) },
        WorkflowRepository,
      ],
    };
  }
}
