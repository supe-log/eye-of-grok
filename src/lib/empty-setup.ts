import { displayNameFromOrgId } from "./org-id";
import type { OrgSnapshot } from "./types";

export function createEmptySetup(orgId: string, ownerName?: string): OrgSnapshot {
  const name = ownerName?.trim() || displayNameFromOrgId(orgId) || "You";
  return {
    orgId,
    pushedAt: new Date().toISOString(),
    source: "manual",
    notes: `New map for ${name}. Paste the Live prompt into your Chief of Staff (or any Bot) to fill it.`,
    nodes: [
      {
        id: "human-you",
        kind: "human",
        name,
        title: "You",
        status: "active",
        lastActiveAt: new Date().toISOString(),
        notes: "Account owner. Your Chief of Staff should report to you.",
      },
    ],
    edges: [],
  };
}
