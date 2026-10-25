import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { workflowDefinitionSchema, workflowNameSchema } from '../domain/workflow-definition.js';
import { ApiError } from '../http/api-error.js';
import { parseInput } from '../http/validation.js';
import { WorkflowRepository } from './workflow.repository.js';

const createWorkflowSchema = z.strictObject({
  name: workflowNameSchema,
  description: z.string().max(500).nullish(),
  definition: workflowDefinitionSchema,
});

const createVersionSchema = z.strictObject({ definition: workflowDefinitionSchema });

const pageQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const workflowIdSchema = z.uuid();
const versionSchema = z.coerce.number().int().min(1).max(2_147_483_647);

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowRepository) {}

  @Post()
  async create(@Body() body: unknown) {
    const input = parseInput(createWorkflowSchema, body);
    return this.workflows.create({
      name: input.name,
      description: input.description ?? null,
      definition: input.definition,
    });
  }

  @Get()
  async list(@Query() query: unknown) {
    const page = parseInput(pageQuerySchema, query);
    const { items, total } = await this.workflows.list(page);
    return { items, page: { ...page, total } };
  }

  @Get(':workflowId')
  async get(@Param('workflowId') rawId: string) {
    const workflowId = parseInput(workflowIdSchema, rawId, 'workflowId');
    const workflow = await this.workflows.findById(workflowId);
    if (!workflow) throw workflowNotFound();
    return workflow;
  }

  @Post(':workflowId/versions')
  async addVersion(@Param('workflowId') rawId: string, @Body() body: unknown) {
    const workflowId = parseInput(workflowIdSchema, rawId, 'workflowId');
    const { definition } = parseInput(createVersionSchema, body);
    const version = await this.workflows.addVersion(workflowId, definition);
    if (!version) throw workflowNotFound();
    return version;
  }

  @Get(':workflowId/versions/:version')
  async getVersion(@Param('workflowId') rawId: string, @Param('version') rawVersion: string) {
    const workflowId = parseInput(workflowIdSchema, rawId, 'workflowId');
    const versionNumber = parseInput(versionSchema, rawVersion, 'version');
    const version = await this.workflows.findVersion(workflowId, versionNumber);
    if (!version) {
      throw new ApiError(
        404,
        'WORKFLOW_VERSION_NOT_FOUND',
        `Workflow version ${versionNumber} not found.`,
      );
    }
    return version;
  }
}

const workflowNotFound = () => new ApiError(404, 'WORKFLOW_NOT_FOUND', 'Workflow not found.');
