import captured from "./fixtures/log-org.json";
import { orgSnapshotSchema } from "./schema";
import type { OrgSnapshot } from "./types";

/** Fictional dense-fleet fixture. Same shape as a 40-bot map; names and dates are invented. */
export const LOG_ORG_FIXTURE = {
  orgId: "log",
  pushedAt: "2026-09-08T11:04:00.000Z",
} as const;

export function createLogOrgFixture(): OrgSnapshot {
  return orgSnapshotSchema.parse(captured);
}
