import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createEmptySetup } from "./empty-setup";
import { createMySetupFixture } from "./my-setup";
import { isValidOrgId, normalizeOrgId } from "./org-id";
import { orgSnapshotSchema } from "./schema";
import { DEFAULT_ORG_ID, type OrgSnapshot } from "./types";

const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "eye-of-grok-orgs")
  : path.join(process.cwd(), "data", "orgs");

function starterFor(orgId: string): OrgSnapshot {
  if (orgId === DEFAULT_ORG_ID) return createMySetupFixture();
  return createEmptySetup(orgId);
}

function fileFor(orgId: string): string {
  return path.join(DATA_DIR, `${orgId}.json`);
}

function ensureDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}

export function saveOrg(snapshot: OrgSnapshot): OrgSnapshot {
  const parsed = orgSnapshotSchema.parse(snapshot);
  ensureDir();
  writeFileSync(fileFor(parsed.orgId), JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
}

export function getOrg(orgId: string): OrgSnapshot | null {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) return null;
  const file = fileFor(id);
  if (!existsSync(file)) {
    return saveOrg(starterFor(id));
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  return orgSnapshotSchema.parse(raw);
}

export function resetOrg(orgId: string = DEFAULT_ORG_ID): OrgSnapshot {
  const id = normalizeOrgId(orgId);
  if (!isValidOrgId(id)) {
    throw new Error(`invalid_org_id: ${orgId}`);
  }
  return saveOrg(starterFor(id));
}

export function upsertOrg(
  orgId: string,
  incoming: unknown,
  sourceFallback: OrgSnapshot["source"],
): OrgSnapshot {
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
  return saveOrg(orgSnapshotSchema.parse(withDefaults));
}
