-- Workflow definitions and their immutable versions.
-- Forward-only: fix mistakes with a new migration, never by editing this file.

CREATE TABLE workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_definitions_name_key UNIQUE (name)
);

CREATE TABLE workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflow_definitions (id),
  version integer NOT NULL CHECK (version > 0),
  definition_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Also serves "latest version of a workflow" lookups (index scanned backwards).
  CONSTRAINT workflow_versions_workflow_id_version_key UNIQUE (workflow_id, version)
);

-- A running execution must never see its definition change underneath it, so
-- versions are append-only. Enforced here as well as in application code.
CREATE FUNCTION workflow_versions_reject_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'workflow_versions rows are immutable'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER workflow_versions_immutable
  BEFORE UPDATE ON workflow_versions
  FOR EACH ROW EXECUTE FUNCTION workflow_versions_reject_update();
