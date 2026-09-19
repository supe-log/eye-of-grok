"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { OrgFlowNodeData } from "@/lib/layout-graph";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL } from "@/lib/status-style";

export type OrgFlowNode = Node<OrgFlowNodeData, "org">;

export function OrgNode({ data, selected }: NodeProps<OrgFlowNode>) {
  const node = data.orgNode;
  const accent = STATUS_COLOR[node.status];
  const dimmed = Boolean(data.dimmed);
  const recommended = Boolean(data.recommended);

  return (
    <div
      className={`org-card org-card-${node.kind}`}
      data-selected={selected}
      data-dimmed={dimmed}
      data-recommended={recommended}
      style={{ ["--status" as string]: accent }}
    >
      <Handle type="target" position={Position.Top} className="org-handle" />
      <div className="org-card-mark" aria-hidden>
        {node.kind === "human" ? "◉" : node.kind === "group" ? "▣" : initial(node.name)}
      </div>
      <div className="org-card-copy">
        <div className="org-card-name">{node.name}</div>
        <div className="org-card-title">{node.title ?? KIND_LABEL[node.kind]}</div>
      </div>
      <div className="org-card-status">{STATUS_LABEL[node.status]}</div>
      <Handle type="source" position={Position.Bottom} className="org-handle" />
    </div>
  );
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}
