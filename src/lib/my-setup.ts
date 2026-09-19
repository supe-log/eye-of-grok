import { DEFAULT_ORG_ID, type OrgSnapshot } from "./types";

export function createMySetupFixture(): OrgSnapshot {
  return {
    orgId: DEFAULT_ORG_ID,
    pushedAt: new Date().toISOString(),
    source: "manual",
    notes: "Your Grok Bot account. Add bots and spaces from Edit.",
    nodes: [
      {
        id: "human-logan",
        kind: "human",
        name: "Logan",
        title: "You",
        status: "active",
        lastActiveAt: new Date().toISOString(),
        notes: "The human this roster belongs to. Add Bots and group spaces around you.",
      },
    ],
    edges: [],
  };
}
