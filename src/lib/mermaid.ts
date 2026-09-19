import type { OrgSnapshot } from "./types";

function mermaidSafeId(id: string): string {
  const cleaned = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

function mermaidLabel(name: string, title?: string, status?: string): string {
  const statusBit = status && status !== "active" ? ` · ${status}` : "";
  const line = title ? `${name}${statusBit}<br/>${title}` : `${name}${statusBit}`;
  return line.replace(/"/g, "#quot;").replace(/\[/g, "(").replace(/\]/g, ")");
}

const EDGE_ARROWS: Record<OrgSnapshot["edges"][number]["kind"], string> = {
  reports_to: "-->",
  member_of: "-.->",
  handoff: "==>",
  shares_context: "-.-",
};

export function snapshotToMermaid(
  snapshot: OrgSnapshot,
  options?: { omitIds?: Iterable<string> },
): string {
  const omit = new Set(options?.omitIds ?? []);
  const nodes = snapshot.nodes.filter((node) => !omit.has(node.id));
  const ids = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter(
    (edge) => ids.has(edge.from) && ids.has(edge.to),
  );

  const humans = nodes.filter((node) => node.kind === "human");
  const bots = nodes.filter((node) => node.kind === "bot");
  const groups = nodes.filter((node) => node.kind === "group");

  const lines: string[] = [
    "flowchart TB",
    `  %% org ${snapshot.orgId} pushed ${snapshot.pushedAt}`,
  ];

  const emit = (node: (typeof nodes)[number]) => {
    const id = mermaidSafeId(node.id);
    const label = mermaidLabel(node.name, node.title, node.status);
    if (node.kind === "group") {
      lines.push(`    ${id}[["${label}"]]`);
      return;
    }
    if (node.kind === "human") {
      lines.push(`    ${id}(("${label}"))`);
      return;
    }
    lines.push(`    ${id}["${label}"]`);
  };

  if (humans.length) {
    lines.push("  subgraph humans [Human]");
    humans.forEach(emit);
    lines.push("  end");
  }
  if (bots.length) {
    lines.push("  subgraph bots [Bots]");
    bots.forEach(emit);
    lines.push("  end");
  }
  if (groups.length) {
    lines.push("  subgraph groups [Spaces]");
    groups.forEach(emit);
    lines.push("  end");
  }

  for (const edge of edges) {
    const arrow = EDGE_ARROWS[edge.kind];
    lines.push(
      `  ${mermaidSafeId(edge.from)} ${arrow}|${edge.kind}| ${mermaidSafeId(edge.to)}`,
    );
  }

  return `${lines.join("\n")}\n`;
}

export function leanOmitIds(snapshot: OrgSnapshot, hideIds: string[]): string[] {
  const hide = new Set(hideIds);
  return snapshot.nodes.filter((node) => hide.has(node.id)).map((node) => node.id);
}
