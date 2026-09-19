import type { EdgeKind, NodeKind, NodeStatus, OrgEdge, OrgNode, OrgSnapshot } from "./types";

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function nextNodeId(snapshot: OrgSnapshot, kind: NodeKind, name: string): string {
  const prefix = kind === "group" ? "grp" : kind === "human" ? "human" : "bot";
  const base = `${prefix}-${slugPart(name) || "node"}`;
  if (!snapshot.nodes.some((node) => node.id === base)) return base;
  let i = 2;
  while (snapshot.nodes.some((node) => node.id === `${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export function nextEdgeId(snapshot: OrgSnapshot, kind: EdgeKind, from: string, to: string): string {
  const base = `e-${kind}-${from}-${to}`.replace(/[^a-z0-9-]+/g, "-");
  if (!snapshot.edges.some((edge) => edge.id === base)) return base;
  return `${base}-${snapshot.edges.length + 1}`;
}

export function addNode(
  snapshot: OrgSnapshot,
  input: {
    name: string;
    title?: string;
    kind: NodeKind;
    status: NodeStatus;
    notes?: string;
    reportsTo?: string;
    memberOf?: string;
  },
): OrgSnapshot {
  const id = nextNodeId(snapshot, input.kind, input.name);
  const node: OrgNode = {
    id,
    kind: input.kind,
    name: input.name.trim(),
    title: input.title?.trim() || undefined,
    status: input.status,
    lastActiveAt: new Date().toISOString(),
    notes: input.notes?.trim() || undefined,
  };
  const edges = [...snapshot.edges];
  const draft = { ...snapshot, nodes: [...snapshot.nodes, node], edges };
  if (input.reportsTo && snapshot.nodes.some((item) => item.id === input.reportsTo)) {
    edges.push({
      id: nextEdgeId(draft, "reports_to", id, input.reportsTo),
      from: id,
      to: input.reportsTo,
      kind: "reports_to",
    });
  }
  if (input.memberOf && snapshot.nodes.some((item) => item.id === input.memberOf)) {
    edges.push({
      id: nextEdgeId({ ...draft, edges }, "member_of", id, input.memberOf),
      from: id,
      to: input.memberOf,
      kind: "member_of",
    });
  }
  return {
    ...snapshot,
    pushedAt: new Date().toISOString(),
    source: "manual",
    nodes: [...snapshot.nodes, node],
    edges,
  };
}

export function addLink(
  snapshot: OrgSnapshot,
  input: { from: string; to: string; kind: EdgeKind },
): OrgSnapshot {
  if (input.from === input.to) return snapshot;
  const exists = snapshot.edges.some(
    (edge) =>
      edge.from === input.from && edge.to === input.to && edge.kind === input.kind,
  );
  if (exists) return snapshot;
  const edge: OrgEdge = {
    id: nextEdgeId(snapshot, input.kind, input.from, input.to),
    from: input.from,
    to: input.to,
    kind: input.kind,
  };
  return {
    ...snapshot,
    pushedAt: new Date().toISOString(),
    source: "manual",
    edges: [...snapshot.edges, edge],
  };
}

export function removeNode(snapshot: OrgSnapshot, id: string): OrgSnapshot {
  return {
    ...snapshot,
    pushedAt: new Date().toISOString(),
    source: "manual",
    nodes: snapshot.nodes.filter((node) => node.id !== id),
    edges: snapshot.edges.filter((edge) => edge.from !== id && edge.to !== id),
  };
}

export function setNodeStatus(
  snapshot: OrgSnapshot,
  id: string,
  status: NodeStatus,
): OrgSnapshot {
  return {
    ...snapshot,
    pushedAt: new Date().toISOString(),
    source: "manual",
    nodes: snapshot.nodes.map((node) =>
      node.id === id ? { ...node, status } : node,
    ),
  };
}
