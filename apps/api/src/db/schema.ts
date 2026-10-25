import type { ColumnType, Generated } from 'kysely';
import type { WorkflowDefinition } from '../domain/workflow-definition.js';

// Hand-written to match migrations/. Column names are camelCase here and
// snake_case in SQL (CamelCasePlugin converts).

export interface WorkflowDefinitionsTable {
  id: Generated<string>;
  name: string;
  description: string | null;
  createdAt: Generated<Date>;
  updatedAt: Generated<Date>;
}

export interface WorkflowVersionsTable {
  id: Generated<string>;
  workflowId: string;
  version: number;
  // Written as JSON text, read back parsed; never updated (versions are immutable).
  definitionJson: ColumnType<WorkflowDefinition, string, never>;
  createdAt: Generated<Date>;
}

export interface DB {
  workflowDefinitions: WorkflowDefinitionsTable;
  workflowVersions: WorkflowVersionsTable;
}
