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

export function displayNameFromOrgId(orgId: string): string {
  return orgId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
