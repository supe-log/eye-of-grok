export const RESERVED_ORG_IDS = new Set([
  "mine",
  "api",
  "u",
  "org",
  "orgs",
  "share",
  "local",
  "mcp",
  "claim",
  "admin",
  "www",
  "health",
  "gallery",
  "index",
  "rotate",
  "static",
  "assets",
]);

export function normalizeOrgId(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug;
}

export function isValidOrgId(orgId: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,47}$/.test(orgId);
}

export function isReservedOrgId(orgId: string): boolean {
  return RESERVED_ORG_IDS.has(orgId);
}

export function isClaimableOrgId(orgId: string): boolean {
  return isValidOrgId(orgId) && !isReservedOrgId(orgId);
}

/** `logan` + 1 → `logan1`. Keeps the id inside the 48-char slug limit. */
export function numberedOrgId(base: string, n: number): string {
  if (n <= 0) return base;
  const suffix = String(n);
  const stem = base.slice(0, Math.max(1, 48 - suffix.length)).replace(/-+$/, "");
  const next = `${stem}${suffix}`;
  return next.slice(0, 48);
}

export function displayNameFromOrgId(orgId: string): string {
  return orgId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
