export function ingestTokenStorageKey(orgId: string): string {
  return `eog.ingest.${orgId}`;
}

export function readStoredIngestToken(orgId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ingestTokenStorageKey(orgId));
  } catch {
    return null;
  }
}

export function writeStoredIngestToken(orgId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ingestTokenStorageKey(orgId), token);
  } catch {
    // Private mode / quota — the claim response still shows the token once.
  }
}
