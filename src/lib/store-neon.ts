import { ensureSnapshotSchema, getSql, toIso } from "./db";
import { parseStoredOrg, RecordExistsError, type OrgRecord } from "./org-record";
import type { StoreBackend } from "./store-backend";
import type { OrgRevision, OrgSnapshot } from "./types";

export function createNeonBackend(): StoreBackend {
  return {
    driver: "neon",
    durable: true,
    async readRecord(orgId) {
      await ensureSnapshotSchema();
      const rows = await getSql()`
        SELECT payload, token_hash, claimed_at, owner_name, anonymous
        FROM org_snapshots
        WHERE org_id = ${orgId}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;
      return parseStoredOrg(orgId, {
        version: 1,
        orgId,
        tokenHash: typeof row.token_hash === "string" ? row.token_hash : null,
        claimedAt: toIso(row.claimed_at),
        ownerName: typeof row.owner_name === "string" ? row.owner_name : undefined,
        anonymous: row.anonymous === true,
        snapshot: row.payload,
      });
    },
    async writeRecord(record, options) {
      await ensureSnapshotSchema();
      const sql = getSql();
      const payload = JSON.stringify(record.snapshot);
      const claimedAt = record.claimedAt;
      const ownerName = record.ownerName ?? null;
      const anonymous = record.anonymous === true;
      const tokenHash = record.tokenHash;
      if (!options.overwrite) {
        const inserted = await sql`
          INSERT INTO org_snapshots (
            org_id, payload, pushed_at, source, token_hash, claimed_at, owner_name, anonymous
          )
          VALUES (
            ${record.orgId},
            ${payload}::jsonb,
            ${record.snapshot.pushedAt}::timestamptz,
            ${record.snapshot.source},
            ${tokenHash},
            ${claimedAt}::timestamptz,
            ${ownerName},
            ${anonymous}
          )
          ON CONFLICT (org_id) DO NOTHING
          RETURNING org_id
        `;
        if (inserted.length === 0) {
          throw new RecordExistsError(record.orgId);
        }
      } else {
        await sql`
          INSERT INTO org_snapshots (
            org_id, payload, pushed_at, source, token_hash, claimed_at, owner_name, anonymous
          )
          VALUES (
            ${record.orgId},
            ${payload}::jsonb,
            ${record.snapshot.pushedAt}::timestamptz,
            ${record.snapshot.source},
            ${tokenHash},
            ${claimedAt}::timestamptz,
            ${ownerName},
            ${anonymous}
          )
          ON CONFLICT (org_id) DO UPDATE SET
            payload = EXCLUDED.payload,
            pushed_at = EXCLUDED.pushed_at,
            source = EXCLUDED.source,
            token_hash = EXCLUDED.token_hash,
            claimed_at = COALESCE(org_snapshots.claimed_at, EXCLUDED.claimed_at),
            owner_name = EXCLUDED.owner_name,
            anonymous = EXCLUDED.anonymous,
            updated_at = now()
        `;
      }
      await sql`
        INSERT INTO org_snapshot_revisions (org_id, payload, pushed_at, source)
        VALUES (
          ${record.orgId},
          ${payload}::jsonb,
          ${record.snapshot.pushedAt}::timestamptz,
          ${record.snapshot.source}
        )
      `;
    },
    async readTokenIndex(tokenHash) {
      await ensureSnapshotSchema();
      const rows = await getSql()`
        SELECT org_id FROM org_token_index WHERE token_hash = ${tokenHash} LIMIT 1
      `;
      const orgId = rows[0]?.org_id;
      return typeof orgId === "string" ? orgId : null;
    },
    async writeTokenIndex(tokenHash, orgId) {
      await ensureSnapshotSchema();
      await getSql()`
        INSERT INTO org_token_index (token_hash, org_id)
        VALUES (${tokenHash}, ${orgId})
        ON CONFLICT (token_hash) DO UPDATE SET org_id = EXCLUDED.org_id
      `;
    },
    async deleteTokenIndex(tokenHash) {
      await ensureSnapshotSchema();
      await getSql()`
        DELETE FROM org_token_index WHERE token_hash = ${tokenHash}
      `;
    },
    async listOrgIds() {
      await ensureSnapshotSchema();
      const rows = await getSql()`
        SELECT org_id FROM org_snapshots
      `;
      return rows.map((row) => String(row.org_id));
    },
  };
}

export async function listNeonRevisions(orgId: string): Promise<OrgRevision[]> {
  await ensureSnapshotSchema();
  const rows = await getSql()`
    SELECT
      id,
      org_id,
      pushed_at,
      source,
      jsonb_array_length(payload->'nodes') AS node_count
    FROM org_snapshot_revisions
    WHERE org_id = ${orgId}
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

export async function loadNeonRevision(
  orgId: string,
  revisionId: number,
): Promise<OrgSnapshot | null> {
  await ensureSnapshotSchema();
  const rows = await getSql()`
    SELECT payload
    FROM org_snapshot_revisions
    WHERE org_id = ${orgId} AND id = ${revisionId}
    LIMIT 1
  `;
  const payload = rows[0]?.payload;
  if (!payload) return null;
  return payload as OrgSnapshot;
}
