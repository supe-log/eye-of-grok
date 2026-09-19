import type { NodeKind, NodeStatus } from "./types";

export const STATUS_LABEL: Record<NodeStatus, string> = {
  active: "Active",
  stale: "Stale",
  hidden: "Hidden · still running",
  deprecated: "Deprecated",
  duplicate: "Duplicate",
};

export const STATUS_COLOR: Record<NodeStatus, string> = {
  active: "#7d9b73",
  stale: "#c4a15a",
  hidden: "#8b8790",
  deprecated: "#c46b5d",
  duplicate: "#8b74a8",
};

export const KIND_LABEL: Record<NodeKind, string> = {
  human: "Human",
  bot: "Bot",
  group: "Space",
};

export function isProblemStatus(status: NodeStatus): boolean {
  return status !== "active";
}

export function relativeTime(iso?: string): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const delta = Date.now() - then;
  const mins = Math.round(delta / 60_000);
  if (mins < 90) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
