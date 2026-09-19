import { orgSnapshotSchema } from "./schema";
import type { OrgSnapshot } from "./types";

export type OrgRecord = {
  version: 1;
  orgId: string;
  tokenHash: string | null;
  claimedAt: string;
  ownerName?: string;
  anonymous?: boolean;
  snapshot: OrgSnapshot;
};

export function isOrgRecord(value: unknown): value is OrgRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.version === 1 && typeof record.orgId === "string" && "snapshot" in record;
}

export function parseStoredOrg(orgId: string, raw: unknown): OrgRecord {
  if (isOrgRecord(raw)) {
    return {
      version: 1,
      orgId,
      tokenHash: typeof raw.tokenHash === "string" ? raw.tokenHash : null,
      claimedAt: typeof raw.claimedAt === "string" ? raw.claimedAt : new Date().toISOString(),
      ownerName: typeof raw.ownerName === "string" ? raw.ownerName : undefined,
      anonymous: raw.anonymous === true,
      snapshot: orgSnapshotSchema.parse({ ...raw.snapshot, orgId }),
    };
  }

  const snapshot = orgSnapshotSchema.parse({
    ...(typeof raw === "object" && raw !== null ? raw : {}),
    orgId,
  });
  return {
    version: 1,
    orgId,
    tokenHash: null,
    claimedAt: snapshot.pushedAt,
    snapshot,
  };
}

export class RecordExistsError extends Error {
  readonly orgId: string;

  constructor(orgId: string) {
    super(`org_exists:${orgId}`);
    this.name = "RecordExistsError";
    this.orgId = orgId;
  }
}
