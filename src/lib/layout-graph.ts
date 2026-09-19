import { Graph, layout } from "@dagrejs/dagre";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { CSSProperties } from "react";
import type { OrgEdge, OrgNode, OrgSnapshot } from "./types";

export const BOT_NODE_W = 176;
export const BOT_NODE_H = 72;
export const GROUP_NODE_W = 188;
export const GROUP_NODE_H = 72;
const RANK_WRAP_WIDTH = 1180;
const RANK_WRAP_GAP_X = 20;
const RANK_WRAP_GAP_Y = 28;

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

function measuredWidth(node: Node<OrgFlowNodeData>): number {
  return node.width ?? nodeSize(node.data.orgNode.kind).width;
}

function measuredHeight(node: Node<OrgFlowNodeData>): number {
  return node.height ?? nodeSize(node.data.orgNode.kind).height;
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
    nodesep: 28,
    ranksep: 86,
    edgesep: 16,
    marginx: 24,
    marginy: 24,
  });

  for (const node of nodesInView) {
    const size = nodeSize(node.kind);
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of snapshot.edges) {
    if (!included.has(edge.from) || !included.has(edge.to)) continue;
    if (edge.kind === "reports_to" && view !== "spaces") {
      g.setEdge(edge.to, edge.from);
      continue;
    }
    if (edge.kind === "member_of" && view === "spaces") {
      g.setEdge(edge.from, edge.to);
    }
  }

  layout(g);

  const nodes: Node<OrgFlowNodeData>[] = wrapWideRanks(
    nodesInView.map((orgNode) => {
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
        width: size.width,
        height: size.height,
        style: { width: size.width, height: size.height },
      };
    }),
  );

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

function wrapWideRanks(nodes: Node<OrgFlowNodeData>[]): Node<OrgFlowNodeData>[] {
  if (nodes.length === 0) return nodes;

  const rows = new Map<number, Node<OrgFlowNodeData>[]>();
  for (const node of nodes) {
    const key = Math.round(node.position.y / 24);
    const row = rows.get(key) ?? [];
    row.push(node);
    rows.set(key, row);
  }

  const next: Node<OrgFlowNodeData>[] = [];
  let yShift = 0;

  for (const key of [...rows.keys()].sort((a, b) => a - b)) {
    const row = (rows.get(key) ?? []).sort((a, b) => a.position.x - b.position.x);
    const total =
      row.reduce((sum, node) => sum + measuredWidth(node), 0) +
      RANK_WRAP_GAP_X * Math.max(0, row.length - 1);

    if (total <= RANK_WRAP_WIDTH) {
      for (const node of row) {
        next.push({
          ...node,
          position: { x: node.position.x, y: node.position.y + yShift },
        });
      }
      continue;
    }

    const avg = row.reduce((sum, node) => sum + measuredWidth(node), 0) / row.length;
    const cols = Math.max(
      1,
      Math.floor((RANK_WRAP_WIDTH + RANK_WRAP_GAP_X) / (avg + RANK_WRAP_GAP_X)),
    );
    const rowHeight = Math.max(...row.map((node) => measuredHeight(node))) + RANK_WRAP_GAP_Y;
    const extraRows = Math.ceil(row.length / cols) - 1;
    const originX = row[0]?.position.x ?? 0;

    row.forEach((node, index) => {
      const col = index % cols;
      const wrapRow = Math.floor(index / cols);
      const chunk = row.slice(wrapRow * cols, wrapRow * cols + cols);
      const chunkWidth =
        chunk.reduce((sum, item) => sum + measuredWidth(item), 0) +
        RANK_WRAP_GAP_X * Math.max(0, chunk.length - 1);
      const startX = originX + Math.max(0, (Math.min(total, RANK_WRAP_WIDTH) - chunkWidth) / 2);
      const x =
        startX +
        chunk
          .slice(0, col)
          .reduce((sum, item) => sum + measuredWidth(item) + RANK_WRAP_GAP_X, 0);

      next.push({
        ...node,
        position: {
          x,
          y: node.position.y + yShift + wrapRow * rowHeight,
        },
      });
    });

    yShift += extraRows * rowHeight;
  }

  return normalizeOrigin(next);
}

function normalizeOrigin(nodes: Node<OrgFlowNodeData>[]): Node<OrgFlowNodeData>[] {
  if (nodes.length === 0) return nodes;
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - minX + 24,
      y: node.position.y - minY + 24,
    },
  }));
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
      return { stroke: "#4c8bf5", strokeWidth: 1.8 };
    case "shares_context":
      return { stroke: "#c9ccd1", strokeWidth: 1.1, strokeDasharray: "2 4" };
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}
