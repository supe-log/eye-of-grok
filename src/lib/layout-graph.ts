import { Graph, layout } from "@dagrejs/dagre";
import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";
import type { CSSProperties } from "react";
import { GROUP_MEMBER_LIMIT, type OrgEdge, type OrgNode, type OrgSnapshot } from "./types";

export const BOT_NODE_W = 176;
export const BOT_NODE_H = 72;
export const GROUP_NODE_W = 188;
export const GROUP_NODE_H = 72;

export type OrgMapView = "all" | "reports" | "spaces";

export type OrgFlowNodeData = {
  orgNode: OrgNode;
  recommended?: boolean;
  dimmed?: boolean;
  linked?: boolean;
};

export type OrgFlowEdgeData = {
  orgEdge: OrgEdge;
};

function nodeSize(kind: OrgNode["kind"]): { width: number; height: number } {
  if (kind === "group") return { width: GROUP_NODE_W, height: GROUP_NODE_H };
  if (kind === "human") return { width: 168, height: 72 };
  return { width: BOT_NODE_W, height: BOT_NODE_H };
}

export type FlowLayoutOptions = {
  maxColumnHeight?: number;
};

export function snapshotToFlow(
  snapshot: OrgSnapshot,
  view: OrgMapView = "all",
  options: FlowLayoutOptions = {},
): {
  nodes: Node<OrgFlowNodeData>[];
  edges: Edge<OrgFlowEdgeData>[];
} {
  const included = visibleIds(snapshot, view);
  const nodesInView = snapshot.nodes.filter((node) => included.has(node.id));

  const g = new Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    ranker: "tight-tree",
    nodesep: 22,
    ranksep: 52,
    edgesep: 10,
    marginx: 16,
    marginy: 16,
  });

  for (const node of nodesInView) {
    const size = nodeSize(node.kind);
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of snapshot.edges) {
    if (!included.has(edge.from) || !included.has(edge.to)) continue;
    if (edge.kind === "reports_to") {
      g.setEdge(edge.to, edge.from);
      continue;
    }
    if (edge.kind === "member_of" && view === "all") {
      g.setEdge(edge.from, edge.to);
    }
  }

  layout(g);

  const placed = nodesInView.map((orgNode) => {
    const size = nodeSize(orgNode.kind);
    const raw = g.node(orgNode.id);
    return {
      id: orgNode.id,
      orgNode,
      width: size.width,
      height: size.height,
      x: (raw?.x ?? 0) - size.width / 2,
      y: (raw?.y ?? 0) - size.height / 2,
    };
  });

  const packed = wrapRanksLeftToRight(placed, options.maxColumnHeight ?? 640);

  const nodes: Node<OrgFlowNodeData>[] = packed.map((node) => ({
    id: node.id,
    type: "org",
    position: { x: node.x, y: node.y },
    data: { orgNode: node.orgNode },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    width: node.width,
    height: node.height,
    style: { width: node.width, height: node.height },
  }));

  const edges: Edge<OrgFlowEdgeData>[] = snapshot.edges.flatMap((orgEdge) => {
    if (!included.has(orgEdge.from) || !included.has(orgEdge.to)) return [];
    return [
      {
        id: orgEdge.id,
        source: orgEdge.from,
        target: orgEdge.to,
        type: "smoothstep",
        data: { orgEdge },
        animated: orgEdge.kind === "handoff",
        className: `edge-${orgEdge.kind}`,
        style: edgeStyle(orgEdge.kind),
        markerEnd:
          orgEdge.kind === "handoff"
            ? {
                type: MarkerType.ArrowClosed,
                color: "#4c8bf5",
                width: 16,
                height: 16,
              }
            : undefined,
      },
    ];
  });

  return { nodes, edges };
}

type PlacedNode = {
  id: string;
  orgNode: OrgNode;
  width: number;
  height: number;
  x: number;
  y: number;
};

function wrapRanksLeftToRight(placed: PlacedNode[], maxColumnHeight: number): PlacedNode[] {
  const rowGap = 14;
  const colGap = 44;
  const ranks = new Map<number, PlacedNode[]>();

  for (const node of placed) {
    const key = Math.round(node.x / 24) * 24;
    const bucket = ranks.get(key) ?? [];
    bucket.push(node);
    ranks.set(key, bucket);
  }

  const ordered = [...ranks.keys()].sort((a, b) => a - b);
  const next: PlacedNode[] = [];
  let xCursor = 16;

  for (const key of ordered) {
    const items = (ranks.get(key) ?? []).sort((a, b) => a.y - b.y || a.id.localeCompare(b.id));
    const colWidth = Math.max(...items.map((item) => item.width), BOT_NODE_W);
    const columns: PlacedNode[][] = [[]];
    const heights = [0];

    for (const item of items) {
      const col = columns.length - 1;
      const nextHeight = heights[col] === 0 ? item.height : heights[col] + rowGap + item.height;
      if (columns[col].length > 0 && nextHeight > maxColumnHeight) {
        columns.push([]);
        heights.push(0);
      }
      const dest = columns.length - 1;
      columns[dest].push(item);
      heights[dest] = heights[dest] === 0 ? item.height : heights[dest] + rowGap + item.height;
    }

    columns.forEach((column, index) => {
      let y = 16;
      const x = xCursor + index * (colWidth + colGap);
      for (const item of column) {
        next.push({ ...item, x, y });
        y += item.height + rowGap;
      }
    });

    xCursor += columns.length * (colWidth + colGap);
  }

  return next;
}

function visibleIds(snapshot: OrgSnapshot, view: OrgMapView): Set<string> {
  if (view === "all") {
    return new Set(snapshot.nodes.map((node) => node.id));
  }

  if (view === "reports") {
    return new Set(
      snapshot.nodes
        .filter((node) => node.kind === "human" || node.kind === "bot")
        .map((node) => node.id),
    );
  }

  const ids = new Set<string>();
  for (const node of snapshot.nodes) {
    if (node.kind === "group") ids.add(node.id);
  }
  for (const edge of snapshot.edges) {
    if (edge.kind === "member_of") {
      ids.add(edge.from);
      ids.add(edge.to);
    }
  }
  return ids;
}

export type SpaceCluster = {
  group: OrgNode;
  members: OrgNode[];
};

export function spaceClusters(snapshot: OrgSnapshot): SpaceCluster[] {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  return snapshot.nodes
    .filter((node) => node.kind === "group")
    .map((group) => {
      const members = snapshot.edges
        .filter((edge) => edge.kind === "member_of" && edge.to === group.id)
        .map((edge) => byId.get(edge.from))
        .filter((node): node is OrgNode => Boolean(node));
      return { group, members };
    })
    .sort((a, b) => {
      const overA = a.members.length > GROUP_MEMBER_LIMIT ? 0 : 1;
      const overB = b.members.length > GROUP_MEMBER_LIMIT ? 0 : 1;
      if (overA !== overB) return overA - overB;
      const staleA = a.group.status === "active" ? 1 : 0;
      const staleB = b.group.status === "active" ? 1 : 0;
      if (staleA !== staleB) return staleA - staleB;
      return a.group.name.localeCompare(b.group.name);
    });
}

export function connectedNeighbors(
  snapshot: OrgSnapshot,
  selectedId: string | null,
): { nodeIds: Set<string>; edgeIds: Set<string> } {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  if (!selectedId) return { nodeIds, edgeIds };
  for (const edge of snapshot.edges) {
    if (edge.from !== selectedId && edge.to !== selectedId) continue;
    edgeIds.add(edge.id);
    nodeIds.add(edge.from === selectedId ? edge.to : edge.from);
  }
  return { nodeIds, edgeIds };
}

function edgeStyle(kind: OrgEdge["kind"]): CSSProperties {
  switch (kind) {
    case "reports_to":
      return { stroke: "#8a8f98", strokeWidth: 1.4 };
    case "member_of":
      return { stroke: "#3fb950", strokeWidth: 1.2, strokeDasharray: "5 4" };
    case "handoff":
      return { stroke: "#4c8bf5", strokeWidth: 1.8 };
    case "shares_context":
      return { stroke: "#c9ccd1", strokeWidth: 1.1, strokeDasharray: "2 4" };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}
