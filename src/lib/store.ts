import { hasDatabase } from "./db";
import { createEmptySetup } from "./empty-setup";
import { galleryCardFromRecord, type OrgGalleryCard } from "./gallery";

export type { OrgGalleryCard };
import { createMySetupFixture } from "./my-setup";
import {
  displayNameFromOrgId,
  isClaimableOrgId,
  isValidOrgId,
  normalizeOrgId,
  numberedOrgId,
} from "./org-id";
import { RecordExistsError, type OrgRecord } from "./org-record";
import { orgSnapshotSchema } from "./schema";
import { createBlobBackend, blobConfigured } from "./store-blob";
import type { StoreBackend, StoreDriver } from "./store-backend";
import {
  createFilesystemBackend,
  defaultFilesystemRoot,
  readLegacySnapshotFile,
} from "./store-fs";
import { createNeonBackend, listNeonRevisions, loadNeonRevision } from "./store-neon";
import { getMineIngestToken, hashToken, mintIngestToken, secretsEqual } from "./tokens";
import { DEFAULT_ORG_ID, type OrgRevision, type OrgSnapshot } from "./types";

let warnedEphemeral = false;

function getBackend(): StoreBackend {
  if (hasDatabase()) return createNeonBackend();
  if (blobConfigured()) return createBlobBackend();
  if (process.env.VERCEL && !warnedEphemeral) {
    warnedEphemeral = true;
    console.warn(
      "Eye of Grok: DATABASE_URL is unset. Snapshots fall back to /tmp and will not survive a cold serverless instance.",
    );
  }
  return createFilesystemBackend(defaultFilesystemRoot());
}

export function getStoreInfo(): { driver: StoreDriver; durable: boolean } {
  const backend = getBackend();
  return { driver: backend.driver, durable: backend.durable };
}

export async function getOrgRecord(orgId: string): Promise<OrgRecord | null> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) return null;
  const backend = getBackend();
  const existing = await backend.readRecord(id);
  if (existing) return existing;

  // Only auto-migrate Logan's checked-in/local mine snapshot. Other slugs are claim-only.
  if (id !== DEFAULT_ORG_ID) return null;
  const legacy = readLegacySnapshotFile(id);
  if (!legacy) return null;
  try {
    await backend.writeRecord(legacy, { overwrite: false });
  } catch (error) {
    if (!(error instanceof RecordExistsError)) throw error;
    return backend.readRecord(id);
  }
  return backend.readRecord(id);
}

export async function lookupOrgIdForTokenHash(tokenHash: string): Promise<string | null> {
  return getBackend().readTokenIndex(tokenHash);
}

export async function getOrg(orgId: string): Promise<OrgSnapshot | null> {
  const id = normalizeOrgId(orgId);
  if (id === DEFAULT_ORG_ID) return ensureMineOrg();
  const record = await getOrgRecord(id);
  return record?.snapshot ?? null;
}

export async function ensureMineOrg(): Promise<OrgSnapshot> {
  const existing = await getOrgRecord(DEFAULT_ORG_ID);
  if (existing) {
    await ensureMineTokenIndex(existing);
    return existing.snapshot;
  }

  const snapshot = createMySetupFixture();
  const mineToken = getMineIngestToken();
  const record: OrgRecord = {
    version: 1,
    orgId: DEFAULT_ORG_ID,
    tokenHash: mineToken ? hashToken(mineToken) : null,
    claimedAt: new Date().toISOString(),
    ownerName: "Logan May",
    snapshot,
  };
  try {
    await getBackend().writeRecord(record, { overwrite: false });
    if (mineToken) {
      await getBackend().writeTokenIndex(hashToken(mineToken), DEFAULT_ORG_ID);
    }
  } catch (error) {
    if (error instanceof RecordExistsError) {
      const again = await getOrgRecord(DEFAULT_ORG_ID);
      if (again) return again.snapshot;
    }
    throw error;
  }
  return snapshot;
}

async function ensureMineTokenIndex(record: OrgRecord): Promise<void> {
  const mineToken = getMineIngestToken();
  if (!mineToken) return;
  const hashed = hashToken(mineToken);
  if (record.tokenHash && secretsEqual(record.tokenHash, hashed)) {
    await getBackend().writeTokenIndex(hashed, DEFAULT_ORG_ID);
    return;
  }
  const next: OrgRecord = { ...record, tokenHash: hashed };
  await getBackend().writeRecord(next, { overwrite: true });
  await getBackend().writeTokenIndex(hashed, DEFAULT_ORG_ID);
}

export async function saveOrgRecord(record: OrgRecord, overwrite: boolean): Promise<OrgRecord> {
  await getBackend().writeRecord(record, { overwrite });
  return record;
}

export async function saveOrg(snapshot: OrgSnapshot): Promise<OrgSnapshot> {
  const parsed = orgSnapshotSchema.parse(snapshot);
  const existing = await getOrgRecord(parsed.orgId);
  if (!existing) {
    throw new Error("org_not_claimed");
  }
  const next: OrgRecord = { ...existing, snapshot: parsed };
  await getBackend().writeRecord(next, { overwrite: true });
  return parsed;
}

export async function resetOrg(orgId: string = DEFAULT_ORG_ID): Promise<OrgSnapshot> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) {
    throw new Error(`invalid_org_id: ${orgId}`);
  }
  if (id === DEFAULT_ORG_ID) {
    const existing = await getOrgRecord(id);
    const snapshot = createMySetupFixture();
    const record: OrgRecord = existing
      ? { ...existing, snapshot }
      : {
          version: 1,
          orgId: id,
          tokenHash: getMineIngestToken() ? hashToken(getMineIngestToken()!) : null,
          claimedAt: new Date().toISOString(),
          ownerName: "Logan May",
          snapshot,
        };
    await getBackend().writeRecord(record, { overwrite: true });
    return snapshot;
  }

  const existing = await getOrgRecord(id);
  if (!existing) {
    throw new Error("org_not_claimed");
  }
  const snapshot = createEmptySetup(id, existing.ownerName);
  await getBackend().writeRecord({ ...existing, snapshot }, { overwrite: true });
  return snapshot;
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
  let existing = await getOrgRecord(id);
  if (!existing && id === DEFAULT_ORG_ID) {
    await ensureMineOrg();
    existing = await getOrgRecord(id);
  }
  if (!existing) {
    throw new Error("org_not_claimed");
  }
  const withDefaults = {
    pushedAt: new Date().toISOString(),
    source: sourceFallback,
    ...incomingObject,
    orgId: id,
  };
  const snapshot = orgSnapshotSchema.parse(withDefaults);
  await getBackend().writeRecord({ ...existing, snapshot }, { overwrite: true });
  return snapshot;
}

export async function listOrgRevisions(orgId: string): Promise<OrgRevision[]> {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) return [];
  if (hasDatabase()) {
    return listNeonRevisions(id);
  }
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
  const payload = await loadNeonRevision(id, revisionId);
  if (!payload) {
    throw new Error(`revision_not_found: ${revisionId}`);
  }
  return saveOrg({
    ...payload,
    orgId: id,
    pushedAt: new Date().toISOString(),
    source: payload.source,
  });
}

export type ClaimResult =
  | {
      ok: true;
      created: true;
      orgId: string;
      token: string;
      snapshot: OrgSnapshot;
    }
  | {
      ok: true;
      created: false;
      orgId: string;
      snapshot: OrgSnapshot;
    }
  | {
      ok: false;
      error: "invalid_org_id" | "reserved_org_id";
      orgId: string;
    };

export async function suggestAvailableOrgIds(
  preferred: string,
  count = 3,
): Promise<string[]> {
  const base = normalizeOrgId(preferred);
  if (!base) return [];
  const suggestions: string[] = [];
  for (let n = 1; suggestions.length < count && n <= 200; n += 1) {
    const candidate = numberedOrgId(base, n);
    if (!isClaimableOrgId(candidate)) continue;
    if (await getOrgRecord(candidate)) continue;
    suggestions.push(candidate);
  }
  return suggestions;
}

export async function listGallery(): Promise<OrgGalleryCard[]> {
  await ensureMineOrg();
  const ids = await getBackend().listOrgIds();
  const unique = [...new Set(ids)];
  const cards: OrgGalleryCard[] = [];
  for (const orgId of unique) {
    const record = await getOrgRecord(orgId);
    if (!record) continue;
    cards.push(galleryCardFromRecord(record));
  }
  return cards.sort((a, b) => {
    if (a.demo !== b.demo) return a.demo ? -1 : 1;
    return Date.parse(b.pushedAt) - Date.parse(a.pushedAt);
  });
}

export async function claimOrg(input: {
  name?: string;
  orgId?: string;
  anonymous?: boolean;
}): Promise<ClaimResult> {
  const orgId = normalizeOrgId(input.orgId || input.name || "");
  if (!isValidOrgId(orgId)) {
    return { ok: false, error: "invalid_org_id", orgId };
  }
  if (!isClaimableOrgId(orgId)) {
    return { ok: false, error: "reserved_org_id", orgId };
  }

  const existing = await getOrgRecord(orgId);
  if (existing) {
    return { ok: true, created: false, orgId, snapshot: existing.snapshot };
  }

  const ownerName = input.name?.trim() || displayNameFromOrgId(orgId);
  const token = mintIngestToken();
  const record: OrgRecord = {
    version: 1,
    orgId,
    tokenHash: hashToken(token),
    claimedAt: new Date().toISOString(),
    ownerName,
    anonymous: input.anonymous === true,
    snapshot: createEmptySetup(orgId, ownerName),
  };

  try {
    await getBackend().writeRecord(record, { overwrite: false });
    await getBackend().writeTokenIndex(hashToken(token), orgId);
  } catch (error) {
    if (error instanceof RecordExistsError) {
      const again = await getOrgRecord(orgId);
      if (again) {
        return { ok: true, created: false, orgId, snapshot: again.snapshot };
      }
    }
    throw error;
  }

  return { ok: true, created: true, orgId, token, snapshot: record.snapshot };
}

export async function rotateOrgToken(orgId: string): Promise<string> {
  const id = normalizeOrgId(orgId);
  if (id === DEFAULT_ORG_ID) {
    throw new Error("mine_uses_env_token");
  }
  const existing = await getOrgRecord(id);
  if (!existing) {
    throw new Error("org_not_claimed");
  }
  const token = mintIngestToken();
  if (existing.tokenHash) {
    await getBackend().deleteTokenIndex(existing.tokenHash);
  }
  const tokenHash = hashToken(token);
  await getBackend().writeRecord({ ...existing, tokenHash }, { overwrite: true });
  await getBackend().writeTokenIndex(tokenHash, id);
  return token;
}

export async function verifyOrgToken(orgId: string, token: string): Promise<boolean> {
  const id = normalizeOrgId(orgId);
  const mine = getMineIngestToken();
  if (id === DEFAULT_ORG_ID && mine && secretsEqual(token, mine)) return true;
  const record = await getOrgRecord(id);
  if (!record) return false;
  if (record.tokenHash) {
    return secretsEqual(hashToken(token), record.tokenHash);
  }
  // Legacy Neon rows created before per-org tokens still accept INGEST_TOKEN.
  return Boolean(mine && secretsEqual(token, mine));
}

export async function resolveOrgIdForToken(token: string): Promise<string | null> {
  const mine = getMineIngestToken();
  if (mine && secretsEqual(token, mine)) return DEFAULT_ORG_ID;
  const orgId = await lookupOrgIdForTokenHash(hashToken(token));
  if (!orgId) return null;
  const matches = await verifyOrgToken(orgId, token);
  return matches ? orgId : null;
}
