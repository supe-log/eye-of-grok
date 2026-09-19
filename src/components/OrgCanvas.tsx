"use client";

import {
  Background,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  connectedNeighbors,
  snapshotToFlow,
  spaceClusters,
  type OrgMapView,
} from "@/lib/layout-graph";
import { GROUP_MEMBER_LIMIT } from "@/lib/types";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL, isProblemStatus } from "@/lib/status-style";
import type { OrgNode, OrgSnapshot } from "@/lib/types";
import { OrgNode as OrgFlowCard, type OrgFlowNode } from "./OrgNode";

const nodeTypes = { org: OrgFlowCard };

const FIT_VIEW = { padding: 0.1, maxZoom: 1.15 } as const;

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
  onSelect: (id: string | null) => void;
}) {
  if (view === "spaces") {
    return (
      <SpaceBoard
        snapshot={snapshot}
        hygiene={hygiene}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    );
  }

  return (
    <ReactFlowProvider>
      <FlowBoard
        snapshot={snapshot}
        view={view}
        hygiene={hygiene}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </ReactFlowProvider>
  );
}

function FlowBoard({
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
  onSelect: (id: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [maxColumnHeight, setMaxColumnHeight] = useState(640);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const next = Math.round(Math.max(360, host.clientHeight - 48) / 40) * 40;
      setMaxColumnHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const flow = useMemo(() => {
    const laid = snapshotToFlow(snapshot, view, { maxColumnHeight });
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
  }, [snapshot, view, hygiene, selectedId, maxColumnHeight]);

  const legend =
    view === "reports"
      ? EDGE_LEGEND.filter((item) => item.kind !== "member_of")
      : EDGE_LEGEND;

  return (
    <div className="org-flow" data-focus={Boolean(selectedId)} ref={hostRef}>
      <ReactFlow
        key={`${snapshot.orgId}-${view}-${maxColumnHeight}`}
        nodes={flow.nodes}
        edges={flow.edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={FIT_VIEW}
        minZoom={0.2}
        maxZoom={1.6}
        onInit={(instance) => instance.fitView(FIT_VIEW)}
        onNodeClick={(_event, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background gap={22} color="var(--dot)" />
        <MiniMap
          pannable
          zoomable
          maskColor="var(--minimap-mask)"
          nodeColor={(node: OrgFlowNode) => STATUS_COLOR[node.data.orgNode.status]}
        />
        <Controls showInteractive={false}>
          <ResetViewButton onClear={() => onSelect(null)} />
        </Controls>
      </ReactFlow>
      <ul className="edge-legend" aria-label="Connection kinds">
        {legend.map((item) => (
          <li key={item.kind} className={`edge-legend-item edge-legend-${item.kind}`}>
            <i aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResetViewButton({ onClear }: { onClear: () => void }) {
  const { fitView } = useReactFlow();
  return (
    <ControlButton
      className="org-reset-view"
      title="Reset view"
      aria-label="Reset view"
      onClick={() => {
        onClear();
        void fitView(FIT_VIEW);
      }}
    >
      <svg viewBox="0 0 16 16" aria-hidden>
        <path
          d="M3.2 8a4.8 4.8 0 1 1 1.3 3.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M2.2 4.6 3.3 8l3.4-.9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </ControlButton>
  );
}

function SpaceBoard({
  snapshot,
  hygiene,
  selectedId,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  hygiene: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const clusters = useMemo(() => spaceClusters(snapshot), [snapshot]);
  const linked = useMemo(
    () => connectedNeighbors(snapshot, selectedId),
    [snapshot, selectedId],
  );

  return (
    <div className="space-board" data-focus={Boolean(selectedId)}>
      {clusters.map(({ group, members }) => {
        const over = members.length > GROUP_MEMBER_LIMIT;
        const flagged = isProblemStatus(group.status) || over;
        const groupSelected = selectedId === group.id;
        const groupLinked = linked.nodeIds.has(group.id);
        const hasSelectedMember = members.some((member) => member.id === selectedId);
        return (
          <article
            key={group.id}
            className="space-card"
            data-selected={groupSelected}
            data-linked={groupLinked || hasSelectedMember}
            data-flagged={hygiene && flagged}
            data-dimmed={hygiene && !flagged && !groupSelected && !groupLinked && !hasSelectedMember}
          >
            <button type="button" className="space-card-head" onClick={() => onSelect(group.id)}>
              <span className="space-card-name">{group.name}</span>
              <span className="space-card-meta">
                {members.length} / {GROUP_MEMBER_LIMIT}
                {over ? " · over cap" : ""}
                {group.status !== "active" ? ` · ${STATUS_LABEL[group.status]}` : ""}
              </span>
            </button>
            <div className="space-members">
              {members.length === 0 ? (
                <p className="muted">No members</p>
              ) : (
                members.map((member) => {
                  const isSelected = selectedId === member.id;
                  const isLinked = linked.nodeIds.has(member.id);
                  const flagged = isProblemStatus(member.status);
                  return (
                    <SpaceMember
                      key={member.id}
                      node={member}
                      selected={isSelected}
                      linked={isLinked}
                      dimmed={
                        (Boolean(selectedId) || hygiene) &&
                        !isSelected &&
                        !isLinked &&
                        !(hygiene && flagged)
                      }
                      flagged={hygiene && flagged}
                      onSelect={onSelect}
                    />
                  );
                })
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SpaceMember({
  node,
  selected,
  linked,
  dimmed,
  flagged,
  onSelect,
}: {
  node: OrgNode;
  selected: boolean;
  linked: boolean;
  dimmed: boolean;
  flagged: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      className={`space-member org-card-${node.kind}`}
      data-selected={selected}
      data-linked={linked}
      data-dimmed={dimmed}
      data-flagged={flagged}
      onClick={() => onSelect(node.id)}
    >
      <span className="org-card-name">{node.name}</span>
      <span className="org-card-title">
        {flagged ? STATUS_LABEL[node.status] : (node.title ?? KIND_LABEL[node.kind])}
      </span>
    </button>
  );
}
