"use client";

import { useMemo } from "react";
import {
  layoutOrgCanvas,
  type OrgCanvasView,
} from "@/lib/layout-graph";
import { KIND_LABEL, STATUS_LABEL, isProblemStatus } from "@/lib/status-style";
import type { OrgSnapshot } from "@/lib/types";

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
  const laid = useMemo(() => layoutOrgCanvas(snapshot, view), [snapshot, view]);

  return (
    <div className="dag-stage">
      <div
        className="dag-board"
        style={{ width: laid.width, height: laid.height }}
      >
        <svg
          className="dag-edges"
          width={laid.width}
          height={laid.height}
          aria-hidden
        >
          {laid.edges.map((edge) => (
            <line
              key={edge.id}
              x1={edge.sourceX}
              y1={edge.sourceY}
              x2={edge.targetX}
              y2={edge.targetY}
              className={`dag-edge dag-edge-${edge.kind}`}
            />
          ))}
        </svg>
        {laid.nodes.map((node) => {
          const flagged = isProblemStatus(node.orgNode.status);
          return (
            <button
              key={node.id}
              type="button"
              className={`dag-node dag-node-${node.orgNode.kind}`}
              data-selected={selectedId === node.id}
              data-dimmed={hygiene && !flagged}
              data-flagged={hygiene && flagged}
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
              }}
              onClick={() => onSelect(node.id)}
            >
              <span className="dag-node-name">{node.orgNode.name}</span>
              <span className="dag-node-meta">
                {hygiene && flagged
                  ? STATUS_LABEL[node.orgNode.status]
                  : (node.orgNode.title ?? KIND_LABEL[node.orgNode.kind])}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
