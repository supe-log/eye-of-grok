"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  connectedNeighbors,
  layoutWrappedReports,
  spaceClusters,
  type OrgCanvasView,
} from "@/lib/layout-graph";
import { GROUP_MEMBER_LIMIT } from "@/lib/types";
import { KIND_LABEL, STATUS_LABEL, isProblemStatus } from "@/lib/status-style";
import type { OrgNode, OrgSnapshot } from "@/lib/types";

export function OrgCanvas({
  snapshot,
  view,
  hygiene,
  selectedId,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  view: OrgCanvasView;
  hygiene: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const frame = () => {
      const next = Math.floor(el.clientWidth);
      if (next > 0) setCanvasWidth(next);
    };
    frame();
    const observer = new ResizeObserver(frame);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (view === "spaces") {
    return (
      <div className="dag-stage" ref={stageRef}>
        <SpaceBoard
          snapshot={snapshot}
          hygiene={hygiene}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </div>
    );
  }

  return (
    <div className="dag-stage" ref={stageRef}>
      <ReportBoard
        snapshot={snapshot}
        canvasWidth={canvasWidth}
        hygiene={hygiene}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}

function ReportBoard({
  snapshot,
  canvasWidth,
  hygiene,
  selectedId,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  canvasWidth: number;
  hygiene: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const laid = useMemo(
    () => layoutWrappedReports(snapshot, canvasWidth),
    [snapshot, canvasWidth],
  );
  const linked = useMemo(
    () => connectedNeighbors(snapshot, selectedId),
    [snapshot, selectedId],
  );

  return (
    <div
      className="dag-board"
      data-focus={Boolean(selectedId)}
      style={{ width: laid.width, height: laid.height }}
    >
      <svg className="dag-edges" width={laid.width} height={laid.height} aria-hidden>
        {laid.edges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.sourceX}
            y1={edge.sourceY}
            x2={edge.targetX}
            y2={edge.targetY}
            className={`dag-edge dag-edge-${edge.kind}`}
            data-linked={linked.edgeIds.has(edge.id)}
          />
        ))}
      </svg>
      {laid.nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node.orgNode}
          selected={selectedId === node.id}
          linked={linked.nodeIds.has(node.id)}
          hygiene={hygiene}
          onSelect={onSelect}
          style={{
            left: node.x,
            top: node.y,
            width: node.width,
            height: node.height,
          }}
        />
      ))}
    </div>
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
  onSelect: (id: string) => void;
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
        const groupLinked = linked.nodeIds.has(group.id);
        const hasSelectedMember = members.some((member) => member.id === selectedId);
        return (
          <article
            key={group.id}
            className="space-card"
            data-selected={selectedId === group.id}
            data-linked={groupLinked || hasSelectedMember}
            data-flagged={hygiene && flagged}
            data-dimmed={hygiene && !flagged}
          >
            <button
              type="button"
              className="space-card-head"
              onClick={() => onSelect(group.id)}
            >
              <span className="dag-node-name">{group.name}</span>
              <span className="dag-node-meta">
                {members.length} / {GROUP_MEMBER_LIMIT}
                {over ? " · over cap" : ""}
                {group.status !== "active" ? ` · ${STATUS_LABEL[group.status]}` : ""}
              </span>
            </button>
            <div className="space-members">
              {members.length === 0 ? (
                <p className="muted">No members</p>
              ) : (
                members.map((member) => (
                  <NodeCard
                    key={member.id}
                    node={member}
                    selected={selectedId === member.id}
                    linked={linked.nodeIds.has(member.id)}
                    hygiene={hygiene}
                    onSelect={onSelect}
                    compact
                  />
                ))
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function NodeCard({
  node,
  selected,
  linked = false,
  hygiene,
  onSelect,
  style,
  compact,
}: {
  node: OrgNode;
  selected: boolean;
  linked?: boolean;
  hygiene: boolean;
  onSelect: (id: string) => void;
  style?: CSSProperties;
  compact?: boolean;
}) {
  const flagged = isProblemStatus(node.status);
  return (
    <button
      type="button"
      className={`dag-node dag-node-${node.kind}${compact ? " space-member" : ""}`}
      data-selected={selected}
      data-linked={linked}
      data-dimmed={hygiene && !flagged && !selected && !linked}
      data-flagged={hygiene && flagged}
      style={style}
      onClick={() => onSelect(node.id)}
    >
      <span className="dag-node-name">{node.name}</span>
      <span className="dag-node-meta">
        {hygiene && flagged
          ? STATUS_LABEL[node.status]
          : (node.title ?? KIND_LABEL[node.kind])}
      </span>
    </button>
  );
}
