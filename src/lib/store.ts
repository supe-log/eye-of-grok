import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createMessyStartupFixture } from "./fixture";
import { orgSnapshotSchema } from "./schema";
import { DEFAULT_ORG_ID, type OrgSnapshot } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "orgs");

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
  const file = fileFor(orgId);
  if (!existsSync(file)) {
    if (orgId === DEFAULT_ORG_ID) {
      return saveOrg(createMessyStartupFixture());
    }
    return null;
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
  return orgSnapshotSchema.parse(raw);
}

export function resetOrg(orgId: string = DEFAULT_ORG_ID): OrgSnapshot {
  const fixture = createMessyStartupFixture();
  fixture.orgId = orgId;
  return saveOrg(fixture);
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
  const withDefaults = {
    pushedAt: new Date().toISOString(),
    source: sourceFallback,
    ...incomingObject,
    orgId,
  };
  return saveOrg(orgSnapshotSchema.parse(withDefaults));
}
