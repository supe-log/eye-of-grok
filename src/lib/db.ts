import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let schemaReady = false;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sql) sql = neon(url);
  return sql;
}

export async function ensureSnapshotSchema(): Promise<void> {
  if (schemaReady) return;
  const client = getSql();
  await client`
    CREATE TABLE IF NOT EXISTS org_snapshots (
      org_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      pushed_at TIMESTAMPTZ NOT NULL,
      source TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await client`
    ALTER TABLE org_snapshots ADD COLUMN IF NOT EXISTS token_hash TEXT
  `;
  await client`
    ALTER TABLE org_snapshots ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ
  `;
  await client`
    ALTER TABLE org_snapshots ADD COLUMN IF NOT EXISTS owner_name TEXT
  `;
  await client`
    ALTER TABLE org_snapshots ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT false
  `;
  await client`
    CREATE TABLE IF NOT EXISTS org_snapshot_revisions (
      id BIGSERIAL PRIMARY KEY,
      org_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      pushed_at TIMESTAMPTZ NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await client`
    CREATE INDEX IF NOT EXISTS org_snapshot_revisions_org_id_id_desc
    ON org_snapshot_revisions (org_id, id DESC)
  `;
  await client`
    CREATE TABLE IF NOT EXISTS org_token_index (
      token_hash TEXT PRIMARY KEY,
      org_id TEXT NOT NULL
    )
  `;
  schemaReady = true;
}

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
}
