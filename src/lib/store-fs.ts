import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { parseStoredOrg, RecordExistsError, type OrgRecord } from "./org-record";
import type { StoreBackend } from "./store-backend";

function writeAtomic(file: string, body: string, exclusive: boolean): void {
  mkdirSync(path.dirname(file), { recursive: true });
  if (exclusive) {
    try {
      writeFileSync(file, body, { encoding: "utf8", flag: "wx" });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") {
        throw new RecordExistsError(path.basename(file, ".json"));
      }
      throw error;
    }
  }
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, body, "utf8");
  renameSync(tmp, file);
}

export function createFilesystemBackend(rootDir: string): StoreBackend {
  const orgsDir = path.join(rootDir, "orgs");
  const tokensDir = path.join(rootDir, "tokens");

  function orgFile(orgId: string): string {
    return path.join(orgsDir, `${orgId}.json`);
  }

  function tokenFile(tokenHash: string): string {
    return path.join(tokensDir, `${tokenHash}.json`);
  }

  return {
    driver: "filesystem",
    durable: false,
    async readRecord(orgId) {
      const file = orgFile(orgId);
      if (!existsSync(file)) return null;
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
      return parseStoredOrg(orgId, raw);
    },
    async writeRecord(record, options) {
      writeAtomic(
        orgFile(record.orgId),
        JSON.stringify(record, null, 2),
        !options.overwrite,
      );
    },
    async readTokenIndex(tokenHash) {
      const file = tokenFile(tokenHash);
      if (!existsSync(file)) return null;
      const raw = JSON.parse(readFileSync(file, "utf8")) as { orgId?: string };
      return typeof raw.orgId === "string" ? raw.orgId : null;
    },
    async writeTokenIndex(tokenHash, orgId) {
      writeAtomic(tokenFile(tokenHash), JSON.stringify({ orgId }, null, 2), false);
    },
    async deleteTokenIndex(tokenHash) {
      const file = tokenFile(tokenHash);
      if (existsSync(file)) unlinkSync(file);
    },
    async listOrgIds() {
      if (!existsSync(orgsDir)) return [];
      return readdirSync(orgsDir)
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.slice(0, -".json".length));
    },
  };
}

export function defaultFilesystemRoot(): string {
  if (process.env.EYE_OF_GROK_DATA_DIR) return process.env.EYE_OF_GROK_DATA_DIR;
  if (process.env.VERCEL) return path.join("/tmp", "eye-of-grok");
  return path.join(process.cwd(), "data");
}

export function legacySnapshotPaths(orgId: string): string[] {
  return [
    path.join(process.cwd(), "data", "orgs", `${orgId}.json`),
    path.join("/tmp", "eye-of-grok-orgs", `${orgId}.json`),
  ];
}

export function readLegacySnapshotFile(orgId: string): OrgRecord | null {
  for (const file of legacySnapshotPaths(orgId)) {
    if (!existsSync(file)) continue;
    try {
      const raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
      return parseStoredOrg(orgId, raw);
    } catch {
      continue;
    }
  }
  return null;
}
