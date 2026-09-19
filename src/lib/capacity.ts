import {
  ACCOUNT_BOT_GROUP_LIMIT,
  GROUP_MEMBER_LIMIT,
  type OrgSnapshot,
} from "./types";

export function countBotsAndGroups(snapshot: OrgSnapshot): number {
  return snapshot.nodes.filter(
    (node) => node.kind === "bot" || node.kind === "group",
  ).length;
}

export function membersOf(snapshot: OrgSnapshot, groupId: string): string[] {
  return snapshot.edges
    .filter((edge) => edge.kind === "member_of" && edge.to === groupId)
    .map((edge) => edge.from);
}

export function overstaffedGroupIds(snapshot: OrgSnapshot): string[] {
  return snapshot.nodes
    .filter((node) => node.kind === "group")
    .filter((group) => membersOf(snapshot, group.id).length > GROUP_MEMBER_LIMIT)
    .map((group) => group.id);
}

export function snapshotCapacity(snapshot: OrgSnapshot) {
  return {
    botsAndGroups: countBotsAndGroups(snapshot),
    limit: ACCOUNT_BOT_GROUP_LIMIT,
    overstaffedGroupIds: overstaffedGroupIds(snapshot),
  };
}

export function problemStatuses() {
  return new Set(["stale", "hidden", "deprecated", "duplicate"] as const);
}

export function hygieneCandidates(snapshot: OrgSnapshot) {
  return snapshot.nodes.filter(
    (node) => node.status !== "active" || overstaffedGroupIds(snapshot).includes(node.id),
  );
}
