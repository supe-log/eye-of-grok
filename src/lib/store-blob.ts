import { del, get, list, put } from "@vercel/blob";
import { parseStoredOrg, RecordExistsError } from "./org-record";
import type { StoreBackend } from "./store-backend";

const PREFIX = "eye-of-grok";

function orgPath(orgId: string): string {
  return `${PREFIX}/orgs/${orgId}.json`;
}

function tokenPath(tokenHash: string): string {
  return `${PREFIX}/tokens/${tokenHash}.json`;
}

async function readJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  if (!text) return null;
  return JSON.parse(text) as T;
}

async function putJson(pathname: string, value: unknown, overwrite: boolean): Promise<void> {
  try {
    await put(pathname, JSON.stringify(value), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: overwrite,
      contentType: "application/json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!overwrite && /already exists|overwrite|conflict|409/i.test(message)) {
      throw new RecordExistsError(pathname);
    }
    throw error;
  }
}

export function createBlobBackend(): StoreBackend {
  return {
    driver: "vercel-blob",
    durable: true,
    async readRecord(orgId) {
      try {
        const raw = await readJson<unknown>(orgPath(orgId));
        if (raw == null) return null;
        return parseStoredOrg(orgId, raw);
      } catch {
        return null;
      }
    },
    async writeRecord(record, options) {
      try {
        await putJson(orgPath(record.orgId), record, options.overwrite);
      } catch (error) {
        if (error instanceof RecordExistsError) {
          throw new RecordExistsError(record.orgId);
        }
        throw error;
      }
    },
    async readTokenIndex(tokenHash) {
      try {
        const raw = await readJson<{ orgId?: string }>(tokenPath(tokenHash));
        return typeof raw?.orgId === "string" ? raw.orgId : null;
      } catch {
        return null;
      }
    },
    async writeTokenIndex(tokenHash, orgId) {
      await putJson(tokenPath(tokenHash), { orgId }, true);
    },
    async deleteTokenIndex(tokenHash) {
      try {
        await del(tokenPath(tokenHash));
      } catch {
        // Index cleanup is best-effort after rotation.
      }
    },
    async listOrgIds() {
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const result = await list({
          prefix: `${PREFIX}/orgs/`,
          cursor,
          limit: 1000,
        });
        for (const blob of result.blobs) {
          const name = blob.pathname.split("/").pop()?.replace(/\.json$/, "") ?? "";
          if (name) ids.push(name);
        }
        cursor = result.hasMore ? result.cursor : undefined;
      } while (cursor);
      return ids;
    },
  };
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
