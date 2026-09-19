export const NODE_KINDS = ["bot", "group", "human"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const NODE_STATUSES = [
  "active",
  "stale",
  "hidden",
  "deprecated",
  "duplicate",
] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const EDGE_KINDS = [
  "reports_to",
  "member_of",
  "handoff",
  "shares_context",
] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export const SNAPSHOT_SOURCES = [
  "chief_of_staff",
  "manual",
  "fixture",
] as const;
export type SnapshotSource = (typeof SNAPSHOT_SOURCES)[number];

export type OrgNode = {
  id: string;
  kind: NodeKind;
  name: string;
  title?: string;
  status: NodeStatus;
  lastActiveAt?: string;
  notes?: string;
};

export type OrgEdge = {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
};

export type OrgSnapshot = {
  orgId: string;
  pushedAt: string;
  source: SnapshotSource;
  notes?: string;
  nodes: OrgNode[];
  edges: OrgEdge[];
};

export const ANALYZE_ACTIONS = [
  "keep",
  "hide",
  "merge",
  "close_group",
] as const;
export type AnalyzeAction = (typeof ANALYZE_ACTIONS)[number];

export type AnalyzeRecommendation = {
  action: AnalyzeAction;
  nodeIds: string[];
  why: string;
};

export type AnalyzeResult = {
  source: "grok-4.6" | "heuristic";
  onboarding: string;
  capacity: {
    botsAndGroups: number;
    limit: number;
    overstaffedGroupIds: string[];
  };
  recommendations: AnalyzeRecommendation[];
  leanMermaid?: string;
};

export const DEFAULT_ORG_ID = "mine";
export const ACCOUNT_BOT_GROUP_LIMIT = 50;
export const GROUP_MEMBER_LIMIT = 6;
