import { ConsoleLogger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'node:http';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config.js';
import { ErrorFilter } from './http/error.filter.js';
import { requestIdMiddleware } from './http/request-id.js';

export async function createApp(config: AppConfig): Promise<INestApplication<Server>> {
  const app = await NestFactory.create<INestApplication<Server>>(AppModule.register(config), {
    logger: new ConsoleLogger({ json: config.logFormat === 'json' }),
  });
  // Registered before the body parser, so even 413/malformed-JSON errors get an ID.
  app.use(requestIdMiddleware);
  app.useGlobalFilters(new ErrorFilter());
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });
  app.enableShutdownHooks();
  return app;
}
