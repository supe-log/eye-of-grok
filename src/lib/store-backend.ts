import type { OrgRecord } from "./org-record";

export type StoreDriver = "neon" | "vercel-blob" | "filesystem";

export type StoreBackend = {
  driver: StoreDriver;
  durable: boolean;
  readRecord(orgId: string): Promise<OrgRecord | null>;
  writeRecord(record: OrgRecord, options: { overwrite: boolean }): Promise<void>;
  readTokenIndex(tokenHash: string): Promise<string | null>;
  writeTokenIndex(tokenHash: string, orgId: string): Promise<void>;
  deleteTokenIndex(tokenHash: string): Promise<void>;
  listOrgIds(): Promise<string[]>;
};
