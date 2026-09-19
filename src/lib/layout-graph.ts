import { Graph, layout } from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { OrgEdge, OrgNode, OrgSnapshot } from "./types";

export const BOT_NODE_W = 196;
export const BOT_NODE_H = 76;
export const GROUP_NODE_W = 220;
export const GROUP_NODE_H = 80;

export type OrgMapView = "all" | "reports" | "spaces";

export type OrgFlowNodeData = {
  orgNode: OrgNode;
  recommended?: boolean;
  dimmed?: boolean;
};

export type OrgFlowEdgeData = {
  orgEdge: OrgEdge;
};

function nodeSize(kind: OrgNode["kind"]): { width: number; height: number } {
  if (kind === "group") return { width: GROUP_NODE_W, height: GROUP_NODE_H };
  if (kind === "human") return { width: 168, height: 72 };
  return { width: BOT_NODE_W, height: BOT_NODE_H };
}

export function snapshotToFlow(
  snapshot: OrgSnapshot,
  view: OrgMapView = "all",
): {
  nodes: Node<OrgFlowNodeData>[];
  edges: Edge<OrgFlowEdgeData>[];
} {
  const included = visibleIds(snapshot, view);
  const nodesInView = snapshot.nodes.filter((node) => included.has(node.id));

  const g = new Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 36,
    ranksep: 78,
    edgesep: 18,
    marginx: 24,
    marginy: 24,
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
    if (edge.kind === "member_of") {
      g.setEdge(edge.from, edge.to);
    }
  }

  layout(g);

  const nodes: Node<OrgFlowNodeData>[] = nodesInView.map((orgNode) => {
    const placed = g.node(orgNode.id);
    const size = nodeSize(orgNode.kind);
    return {
      id: orgNode.id,
      type: "org",
      position: {
        x: (placed?.x ?? 0) - size.width / 2,
        y: (placed?.y ?? 0) - size.height / 2,
      },
      data: { orgNode },
      style: { width: size.width, height: size.height },
    };
  });

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
      },
    ];
  });

  return { nodes, edges };
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

function edgeStyle(kind: OrgEdge["kind"]): CSSProperties {
  switch (kind) {
    case "reports_to":
      return { stroke: "#8a8f98", strokeWidth: 1.4 };
    case "member_of":
      return { stroke: "#3fb950", strokeWidth: 1.2, strokeDasharray: "5 4" };
    case "handoff":
      return { stroke: "#4c8bf5", strokeWidth: 1.6 };
    case "shares_context":
      return { stroke: "#c9ccd1", strokeWidth: 1.1, strokeDasharray: "2 4" };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}
