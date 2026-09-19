"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useMemo } from "react";
import { connectedNeighbors, snapshotToFlow, type OrgMapView } from "@/lib/layout-graph";
import { STATUS_COLOR, isProblemStatus } from "@/lib/status-style";
import type { OrgSnapshot } from "@/lib/types";
import { OrgNode, type OrgFlowNode } from "./OrgNode";

const nodeTypes = { org: OrgNode };

const EDGE_LEGEND = [
  { kind: "reports_to", label: "Reports" },
  { kind: "member_of", label: "Member of" },
  { kind: "handoff", label: "Handoff" },
  { kind: "shares_context", label: "Shares context" },
] as const;

export function OrgCanvas({
  snapshot,
  view,
  hygiene,
  selectedId,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  view: OrgMapView;
  hygiene: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <OrgCanvasInner
        snapshot={snapshot}
        view={view}
        hygiene={hygiene}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </ReactFlowProvider>
  );
}

function OrgCanvasInner({
  snapshot,
  view,
  hygiene,
  selectedId,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  view: OrgMapView;
  hygiene: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const flow = useMemo(() => {
    const laid = snapshotToFlow(snapshot, view);
    const linked = connectedNeighbors(snapshot, selectedId);
    const focused = Boolean(selectedId);
    return {
      nodes: laid.nodes.map((node) => {
        const flagged = isProblemStatus(node.data.orgNode.status);
        const isSelected = selectedId === node.id;
        const isLinked = linked.nodeIds.has(node.id);
        return {
          ...node,
          selected: isSelected,
          data: {
            ...node.data,
            linked: isLinked,
            dimmed: (focused || hygiene) && !isSelected && !isLinked && !(hygiene && flagged),
            recommended: hygiene && flagged,
          },
        };
      }),
      edges: laid.edges.map((edge) => {
        const isLinked = linked.edgeIds.has(edge.id);
        return {
          ...edge,
          className: `${edge.className ?? ""}${isLinked ? " edge-linked" : ""}`.trim(),
        };
      }),
    };
  }, [snapshot, view, hygiene, selectedId]);

  return (
    <div className="org-flow" data-focus={Boolean(selectedId)}>
      <ReactFlow
        key={`${snapshot.orgId}-${view}`}
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        minZoom={0.35}
        maxZoom={1.6}
        onNodeClick={(_event, node) => onSelect(node.id)}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background gap={22} color="#2a2c30" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(5, 5, 5, 0.72)"
          nodeColor={(node: OrgFlowNode) =>
            STATUS_COLOR[node.data.orgNode.status]
          }
        />
        <Controls showInteractive={false} />
      </ReactFlow>
      <ul className="edge-legend" aria-label="Connection kinds">
        {EDGE_LEGEND.map((item) => (
          <li
            key={item.kind}
            className={`edge-legend-item edge-legend-${item.kind}`}
          >
            <i aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
