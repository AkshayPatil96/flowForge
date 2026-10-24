import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Server } from 'node:http';
import { AppModule } from './app.module.js';

export async function createApp(): Promise<INestApplication<Server>> {
  const app = await NestFactory.create<INestApplication<Server>>(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableShutdownHooks();
  return app;
}
