import { Graph, layout } from "@dagrejs/dagre";
import type { OrgEdge, OrgNode, OrgSnapshot } from "./types";

export type OrgCanvasView = "reports" | "spaces";

export const NODE_W = 148;
export const NODE_H = 48;

export type LaidNode = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orgNode: OrgNode;
};

export type LaidEdge = {
  id: string;
  kind: OrgEdge["kind"];
  from: string;
  to: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

export type OrgCanvasLayout = {
  nodes: LaidNode[];
  edges: LaidEdge[];
  width: number;
  height: number;
};

export function layoutOrgCanvas(
  snapshot: OrgSnapshot,
  view: OrgCanvasView,
): OrgCanvasLayout {
  const included = new Set(visibleIds(snapshot, view));
  const nodes = snapshot.nodes.filter((node) => included.has(node.id));
  const graphEdges = rankingEdges(snapshot, view, included);

  const g = new Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    nodesep: 18,
    ranksep: 64,
    edgesep: 12,
    marginx: 20,
    marginy: 20,
  });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_W, height: NODE_H });
  }
  for (const edge of graphEdges) {
    g.setEdge(edge.parent, edge.child);
  }

  layout(g);

  const laidNodes: LaidNode[] = nodes.map((orgNode) => {
    const placed = g.node(orgNode.id);
    const x = (placed?.x ?? 0) - NODE_W / 2;
    const y = (placed?.y ?? 0) - NODE_H / 2;
    return { id: orgNode.id, x, y, width: NODE_W, height: NODE_H, orgNode };
  });

  const byId = new Map(laidNodes.map((node) => [node.id, node]));
  const edges: LaidEdge[] = graphEdges.flatMap((edge) => {
    const parent = byId.get(edge.parent);
    const child = byId.get(edge.child);
    if (!parent || !child) return [];
    return [
      {
        id: edge.id,
        kind: edge.kind,
        from: edge.parent,
        to: edge.child,
        sourceX: parent.x + parent.width / 2,
        sourceY: parent.y + parent.height,
        targetX: child.x + child.width / 2,
        targetY: child.y,
      },
    ];
  });

  const width = Math.max(
    320,
    ...laidNodes.map((node) => node.x + node.width + 20),
  );
  const height = Math.max(
    200,
    ...laidNodes.map((node) => node.y + node.height + 20),
  );

  return { nodes: laidNodes, edges, width, height };
}

function visibleIds(snapshot: OrgSnapshot, view: OrgCanvasView): string[] {
  if (view === "reports") {
    return snapshot.nodes
      .filter((node) => node.kind === "human" || node.kind === "bot")
      .map((node) => node.id);
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
  return [...ids];
}

function rankingEdges(
  snapshot: OrgSnapshot,
  view: OrgCanvasView,
  included: Set<string>,
): Array<{ id: string; parent: string; child: string; kind: OrgEdge["kind"] }> {
  if (view === "reports") {
    return snapshot.edges
      .filter(
        (edge) =>
          edge.kind === "reports_to" &&
          included.has(edge.from) &&
          included.has(edge.to),
      )
      .map((edge) => ({
        id: edge.id,
        parent: edge.to,
        child: edge.from,
        kind: edge.kind,
      }));
  }

  return snapshot.edges
    .filter(
      (edge) =>
        edge.kind === "member_of" &&
        included.has(edge.from) &&
        included.has(edge.to),
    )
    .map((edge) => ({
      id: edge.id,
      parent: edge.to,
      child: edge.from,
      kind: edge.kind,
    }));
}
