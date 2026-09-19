import { GROUP_MEMBER_LIMIT, type OrgEdge, type OrgNode, type OrgSnapshot } from "./types";

export type OrgCanvasView = "reports" | "spaces";

export const NODE_W = 148;
export const NODE_H = 48;
export const NODE_GAP_X = 12;
export const NODE_GAP_Y = 22;
export const LAYOUT_PAD = 20;

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

export type SpaceCluster = {
  group: OrgNode;
  members: OrgNode[];
};

export function columnsForWidth(width: number): number {
  const inner = Math.max(280, width) - LAYOUT_PAD * 2;
  return Math.max(1, Math.floor((inner + NODE_GAP_X) / (NODE_W + NODE_GAP_X)));
}

export function layoutOrgCanvas(
  snapshot: OrgSnapshot,
  view: OrgCanvasView,
  canvasWidth = 720,
): OrgCanvasLayout {
  if (view === "spaces") {
    return { nodes: [], edges: [], width: canvasWidth, height: 200 };
  }
  return layoutWrappedReports(snapshot, canvasWidth);
}

export function layoutWrappedReports(
  snapshot: OrgSnapshot,
  canvasWidth: number,
): OrgCanvasLayout {
  const people = snapshot.nodes.filter(
    (node) => node.kind === "human" || node.kind === "bot",
  );
  const byId = new Map(people.map((node) => [node.id, node]));
  const levels = reportLevels(snapshot);
  const cols = columnsForWidth(canvasWidth);
  const gridW = cols * NODE_W + Math.max(0, cols - 1) * NODE_GAP_X;
  const boardW = Math.max(canvasWidth, gridW + LAYOUT_PAD * 2);
  const originX = Math.max(LAYOUT_PAD, (boardW - gridW) / 2);

  const laidNodes: LaidNode[] = [];
  let y = LAYOUT_PAD;

  for (const level of levels) {
    const rows = chunk(level, cols);
    for (const row of rows) {
      const rowW = row.length * NODE_W + Math.max(0, row.length - 1) * NODE_GAP_X;
      const startX = originX + (gridW - rowW) / 2;
      row.forEach((id, index) => {
        const orgNode = byId.get(id);
        if (!orgNode) return;
        laidNodes.push({
          id,
          x: startX + index * (NODE_W + NODE_GAP_X),
          y,
          width: NODE_W,
          height: NODE_H,
          orgNode,
        });
      });
      y += NODE_H + NODE_GAP_Y;
    }
  }

  const placed = new Map(laidNodes.map((node) => [node.id, node]));
  const edges: LaidEdge[] = [];
  for (const edge of snapshot.edges) {
    if (edge.kind !== "reports_to") continue;
    const child = placed.get(edge.from);
    const parent = placed.get(edge.to);
    if (!parent || !child) continue;
    edges.push({
      id: edge.id,
      kind: edge.kind,
      from: edge.from,
      to: edge.to,
      sourceX: parent.x + parent.width / 2,
      sourceY: parent.y + parent.height,
      targetX: child.x + child.width / 2,
      targetY: child.y,
    });
  }

  return {
    nodes: laidNodes,
    edges,
    width: boardW,
    height: Math.max(LAYOUT_PAD * 2 + NODE_H, y - NODE_GAP_Y + LAYOUT_PAD),
  };
}

export function spaceClusters(snapshot: OrgSnapshot): SpaceCluster[] {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const groups = snapshot.nodes.filter((node) => node.kind === "group");
  return groups
    .map((group) => {
      const memberIds = snapshot.edges
        .filter((edge) => edge.kind === "member_of" && edge.to === group.id)
        .map((edge) => edge.from);
      const members = memberIds
        .map((id) => byId.get(id))
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

function reportLevels(snapshot: OrgSnapshot): string[][] {
  const people = snapshot.nodes.filter(
    (node) => node.kind === "human" || node.kind === "bot",
  );
  const order = new Map(people.map((node, index) => [node.id, index]));
  const children = new Map<string, string[]>();
  const peopleIds = new Set(people.map((node) => node.id));

  for (const edge of snapshot.edges) {
    if (edge.kind !== "reports_to") continue;
    if (!peopleIds.has(edge.from) || !peopleIds.has(edge.to)) continue;
    const list = children.get(edge.to) ?? [];
    list.push(edge.from);
    children.set(edge.to, list);
  }

  const childIds = new Set([...children.values()].flat());
  const roots = people
    .filter((node) => !childIds.has(node.id))
    .map((node) => node.id)
    .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  const levels: string[][] = [];
  const seen = new Set<string>();
  let current = roots;
  while (current.length > 0) {
    levels.push(current);
    for (const id of current) seen.add(id);
    const next: string[] = [];
    for (const id of current) {
      for (const child of children.get(id) ?? []) {
        if (!seen.has(child) && !next.includes(child)) next.push(child);
      }
    }
    next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    current = next;
  }

  const missing = people.filter((node) => !seen.has(node.id)).map((node) => node.id);
  if (missing.length > 0) levels.push(missing);
  return levels;
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

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}
