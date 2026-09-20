import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { ensureSnapshotSchema, getSql, hasDatabase } from "./db";
import { createEmptySetup } from "./empty-setup";
import { createLogOrgFixture } from "./log-org";
import { createMySetupFixture } from "./my-setup";
import { isValidOrgId, normalizeOrgId } from "./org-id";
import { orgSnapshotSchema } from "./schema";
import {
  DEFAULT_ORG_ID,
  type OrgRevision,
  type OrgSnapshot,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "orgs");

function starterFor(orgId: string): OrgSnapshot {
  if (orgId === "log") return createLogOrgFixture();
  if (orgId === DEFAULT_ORG_ID) return createMySetupFixture();
  return createEmptySetup(orgId);
}

function fileFor(orgId: string): string {
  return path.join(DATA_DIR, `${orgId}.json`);
}

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

function parseSnapshot(raw: unknown): OrgSnapshot {
  return orgSnapshotSchema.parse(raw);
}

export async function saveOrg(snapshot: OrgSnapshot): Promise<OrgSnapshot> {
  const parsed = parseSnapshot(snapshot);
  if (hasDatabase()) return saveOrgDb(parsed);
  return saveOrgFile(parsed);
}

export async function getOrg(orgId: string): Promise<OrgSnapshot | null> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) return null;
  if (hasDatabase()) {
    await ensureSnapshotSchema();
    const rows = await getSql()`
      SELECT payload FROM org_snapshots WHERE org_id = ${id} LIMIT 1
    `;
    const payload = rows[0]?.payload;
    if (payload) return parseSnapshot(payload);
    return saveOrg(starterFor(id));
  }
  const file = fileFor(id);
  if (!existsSync(file)) {
    return saveOrg(starterFor(id));
  }
  return parseSnapshot(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

export async function resetOrg(orgId: string = DEFAULT_ORG_ID): Promise<OrgSnapshot> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) {
    throw new Error(`invalid_org_id: ${orgId}`);
  }
  return saveOrg(starterFor(id));
}

export async function upsertOrg(
  orgId: string,
  incoming: unknown,
  sourceFallback: OrgSnapshot["source"],
): Promise<OrgSnapshot> {
  const incomingObject =
    typeof incoming === "object" && incoming !== null
      ? (incoming as Record<string, unknown>)
      : {};
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) {
    throw new Error(`invalid_org_id: ${orgId}`);
  }
  const withDefaults = {
    pushedAt: new Date().toISOString(),
    source: sourceFallback,
    ...incomingObject,
    orgId: id,
  };
  return saveOrg(parseSnapshot(withDefaults));
}

export async function listOrgRevisions(orgId: string): Promise<OrgRevision[]> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) return [];
  if (!hasDatabase()) {
    const current = await getOrg(id);
    if (!current) return [];
    return [
      {
        id: 0,
        orgId: current.orgId,
        pushedAt: current.pushedAt,
        source: current.source,
        nodeCount: current.nodes.length,
      },
    ];
  }
  await ensureSnapshotSchema();
  const rows = await getSql()`
    SELECT
      id,
      org_id,
      pushed_at,
      source,
      jsonb_array_length(payload->'nodes') AS node_count
    FROM org_snapshot_revisions
    WHERE org_id = ${id}
    ORDER BY id DESC
    LIMIT 20
  `;
  return rows.map((row) => ({
    id: Number(row.id),
    orgId: String(row.org_id),
    pushedAt: toIso(row.pushed_at),
    source: String(row.source),
    nodeCount: Number(row.node_count ?? 0),
  }));
}

export async function restoreOrgRevision(
  orgId: string,
  revisionId: number,
): Promise<OrgSnapshot> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) {
    throw new Error(`invalid_org_id: ${orgId}`);
  }
  if (!hasDatabase()) {
    throw new Error("revisions_require_database");
  }
  await ensureSnapshotSchema();
  const rows = await getSql()`
    SELECT payload
    FROM org_snapshot_revisions
    WHERE org_id = ${id} AND id = ${revisionId}
    LIMIT 1
  `;
  const payload = rows[0]?.payload;
  if (!payload) {
    throw new Error(`revision_not_found: ${revisionId}`);
  }
  const snapshot = parseSnapshot(payload);
  return saveOrg({
    ...snapshot,
    orgId: id,
    pushedAt: new Date().toISOString(),
    source: snapshot.source,
  });
}

function saveOrgFile(parsed: OrgSnapshot): OrgSnapshot {
  ensureDir();
  writeFileSync(fileFor(parsed.orgId), JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
}

async function saveOrgDb(parsed: OrgSnapshot): Promise<OrgSnapshot> {
  await ensureSnapshotSchema();
  const sql = getSql();
  const payload = JSON.stringify(parsed);
  await sql`
    INSERT INTO org_snapshots (org_id, payload, pushed_at, source)
    VALUES (${parsed.orgId}, ${payload}::jsonb, ${parsed.pushedAt}::timestamptz, ${parsed.source})
    ON CONFLICT (org_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      pushed_at = EXCLUDED.pushed_at,
      source = EXCLUDED.source,
      updated_at = now()
  `;
  await sql`
    INSERT INTO org_snapshot_revisions (org_id, payload, pushed_at, source)
    VALUES (${parsed.orgId}, ${payload}::jsonb, ${parsed.pushedAt}::timestamptz, ${parsed.source})
  `;
  return parsed;
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
}
