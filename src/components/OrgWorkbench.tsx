"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import { addLink, addNode, removeNode, setNodeStatus } from "@/lib/graph-edit";
import { snapshotToFlow } from "@/lib/layout-graph";
import { snapshotToMermaid } from "@/lib/mermaid";
import { snapshotCapacity } from "@/lib/capacity";
import {
  DEFAULT_ORG_ID,
  EDGE_KINDS,
  NODE_KINDS,
  NODE_STATUSES,
  type EdgeKind,
  type NodeKind,
  type NodeStatus,
  type OrgSnapshot,
} from "@/lib/types";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL, isProblemStatus, relativeTime } from "@/lib/status-style";
import Link from "next/link";
import { MermaidView } from "./MermaidView";
import { OrgNode, type OrgFlowNode } from "./OrgNode";

const nodeTypes = { org: OrgNode };
const ORG_ID = DEFAULT_ORG_ID;

type Tab = "inspect" | "edit" | "mermaid" | "connect";

export function OrgWorkbench({
  initialSnapshot,
}: {
  initialSnapshot: OrgSnapshot;
}) {
  return (
    <ReactFlowProvider>
      <WorkbenchInner initialSnapshot={initialSnapshot} />
    </ReactFlowProvider>
  );
}

function WorkbenchInner({
  initialSnapshot,
}: {
  initialSnapshot: OrgSnapshot;
}) {
  const [snapshot, setSnapshot] = useState<OrgSnapshot>(initialSnapshot);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSnapshot.nodes[0]?.id ?? null,
  );
  const [hygiene, setHygiene] = useState(false);
  const [tab, setTab] = useState<Tab>("edit");
  const [ingestToken, setIngestToken] = useState("hackathon-demo");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const persist = useCallback(
    async (next: OrgSnapshot) => {
      setBusy(true);
      setSaveMsg(null);
      try {
        const res = await fetch(`/api/orgs/${ORG_ID}/snapshot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ingestToken}`,
          },
          body: JSON.stringify(next),
        });
        const body = (await res.json()) as OrgSnapshot & { detail?: string; error?: string };
        if (!res.ok || !body.nodes) {
          setSaveMsg(body.detail || body.error || `Save failed (${res.status})`);
          return;
        }
        setSnapshot(body);
        setSaveMsg(`Saved ${body.nodes.length} nodes`);
      } catch (error) {
        setSaveMsg(error instanceof Error ? error.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [ingestToken],
  );

  const apply = useCallback(
    (next: OrgSnapshot) => {
      setSnapshot(next);
      void persist(next);
    },
    [persist],
  );

  const reset = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(`/api/orgs/${ORG_ID}?reset=1`, { cache: "no-store" });
    if (!res.ok) {
      setLoadError(`Could not reset (${res.status})`);
      return;
    }
    const next = (await res.json()) as OrgSnapshot;
    setSnapshot(next);
    setSelectedId(next.nodes[0]?.id ?? null);
    setSaveMsg("Starter reset");
  }, []);

  const flow = useMemo(() => {
    const laid = snapshotToFlow(snapshot);
    return {
      nodes: laid.nodes.map((node) => {
        const flagged = isProblemStatus(node.data.orgNode.status);
        return {
          ...node,
          data: {
            ...node.data,
            dimmed: hygiene && !flagged,
            recommended: hygiene && flagged,
          },
        };
      }),
      edges: laid.edges,
    };
  }, [snapshot, hygiene]);

  const selected = snapshot.nodes.find((node) => node.id === selectedId) ?? null;
  const capacity = snapshotCapacity(snapshot);
  const mermaid = snapshotToMermaid(snapshot);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Eye of Grok</span>
          <span className="brand-sub">
            Your Grok Bot setup
            <Link className="brand-pitch" href="/pitch">
              Pitch
            </Link>
          </span>
        </div>
        <div className="gauges">
          <Gauge
            label="Bots + spaces"
            value={`${capacity.botsAndGroups} / ${capacity.limit}`}
            warn={capacity.botsAndGroups > 30}
          />
          <Gauge
            label="Over-cap spaces"
            value={String(capacity.overstaffedGroupIds.length)}
            warn={capacity.overstaffedGroupIds.length > 0}
          />
          <Gauge label="Updated" value={relativeTime(snapshot.pushedAt)} />
        </div>
        <div className="top-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={hygiene}
              onChange={(event) => setHygiene(event.target.checked)}
            />
            Flag stale
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => void reset()}>
            Reset starter
          </button>
          <button type="button" className="btn" onClick={() => setTab("edit")}>
            Add to map
          </button>
        </div>
      </header>

      {loadError && <p className="panel-error">{loadError}</p>}
      {saveMsg && <p className="muted">{busy ? "Saving…" : saveMsg}</p>}

      <section className="stage">
        <div className="canvas">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.35}
            maxZoom={1.6}
            onNodeClick={(_event, node) => {
              setSelectedId(node.id);
              setTab("inspect");
            }}
            nodesConnectable={false}
            edgesFocusable={false}
          >
            <Background gap={22} color="#2a2620" />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(16,14,12,0.72)"
              nodeColor={(node: OrgFlowNode) => STATUS_COLOR[node.data.orgNode.status]}
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className="rail">
          <nav className="tabs">
            {(
              [
                ["inspect", "Inspect"],
                ["edit", "Edit"],
                ["mermaid", "Mermaid"],
                ["connect", "Connect"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="tab"
                data-active={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="rail-body">
            {tab === "inspect" && (
              <InspectPanel
                snapshot={snapshot}
                selected={selected}
                onSelect={setSelectedId}
                onStatus={(id, status) => apply(setNodeStatus(snapshot, id, status))}
                onRemove={(id) => apply(removeNode(snapshot, id))}
              />
            )}
            {tab === "edit" && (
              <EditPanel
                snapshot={snapshot}
                onAdd={(next) => {
                  apply(next);
                  const added = next.nodes[next.nodes.length - 1];
                  if (added) setSelectedId(added.id);
                }}
                onLink={(next) => apply(next)}
              />
            )}
            {tab === "mermaid" && <MermaidPanel current={mermaid} />}
            {tab === "connect" && (
              <ConnectPanel token={ingestToken} onToken={setIngestToken} />
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

function Gauge({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="gauge" data-warn={warn}>
      <span className="gauge-label">{label}</span>
      <span className="gauge-value">{value}</span>
    </div>
  );
}

function InspectPanel({
  snapshot,
  selected,
  onSelect,
  onStatus,
  onRemove,
}: {
  snapshot: OrgSnapshot;
  selected: OrgSnapshot["nodes"][number] | null;
  onSelect: (id: string) => void;
  onStatus: (id: string, status: NodeStatus) => void;
  onRemove: (id: string) => void;
}) {
  const memberships = selected
    ? snapshot.edges
        .filter((edge) => edge.kind === "member_of" && edge.from === selected.id)
        .map((edge) => snapshot.nodes.find((node) => node.id === edge.to)?.name ?? edge.to)
    : [];
  const members = selected
    ? snapshot.edges
        .filter((edge) => edge.kind === "member_of" && edge.to === selected.id)
        .map((edge) => snapshot.nodes.find((node) => node.id === edge.from)?.name ?? edge.from)
    : [];

  return (
    <div className="stack">
      {selected ? (
        <>
          <p className="kicker">
            {KIND_LABEL[selected.kind]} · {STATUS_LABEL[selected.status]}
          </p>
          <h2>{selected.name}</h2>
          <p className="lede">{selected.title}</p>
          <p className="body">{selected.notes ?? "No notes yet."}</p>
          <dl className="meta">
            <div>
              <dt>Last active</dt>
              <dd>{relativeTime(selected.lastActiveAt)}</dd>
            </div>
            <div>
              <dt>Id</dt>
              <dd>
                <code>{selected.id}</code>
              </dd>
            </div>
          </dl>
          {selected.kind === "bot" && (
            <p className="callout">
              Memory is this Bot&apos;s. Tools and the computer are account-level. Hide does not
              pause routines.
            </p>
          )}
          {memberships.length > 0 && (
            <p className="muted">Spaces: {memberships.join(", ")}</p>
          )}
          {members.length > 0 && <p className="muted">Members: {members.join(", ")}</p>}
          <label className="field">
            <span>Status</span>
            <select
              value={selected.status}
              onChange={(event) => onStatus(selected.id, event.target.value as NodeStatus)}
            >
              {NODE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
          {selected.kind !== "human" && (
            <button type="button" className="btn btn-ghost" onClick={() => onRemove(selected.id)}>
              Remove from map
            </button>
          )}
        </>
      ) : (
        <p className="muted">Click a node, or add one from Edit.</p>
      )}
      <h3>Your setup</h3>
      <ul className="roster">
        {snapshot.nodes.map((node) => (
          <li key={node.id}>
            <button type="button" onClick={() => onSelect(node.id)}>
              <i style={{ background: STATUS_COLOR[node.status] }} />
              <span>{node.name}</span>
              <em>{node.title ?? KIND_LABEL[node.kind]}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditPanel({
  snapshot,
  onAdd,
  onLink,
}: {
  snapshot: OrgSnapshot;
  onAdd: (next: OrgSnapshot) => void;
  onLink: (next: OrgSnapshot) => void;
}) {
  const [kind, setKind] = useState<NodeKind>("bot");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<NodeStatus>("active");
  const [notes, setNotes] = useState("");
  const humansAndBots = snapshot.nodes.filter((node) => node.kind !== "group");
  const groups = snapshot.nodes.filter((node) => node.kind === "group");
  const defaultReportsTo = humansAndBots[0]?.id ?? "";
  const [reportsTo, setReportsTo] = useState(defaultReportsTo);
  const [memberOf, setMemberOf] = useState("");
  const [linkFrom, setLinkFrom] = useState(snapshot.nodes[0]?.id ?? "");
  const [linkTo, setLinkTo] = useState(snapshot.nodes[1]?.id ?? snapshot.nodes[0]?.id ?? "");
  const [linkKind, setLinkKind] = useState<EdgeKind>("handoff");

  return (
    <div className="stack">
      <p className="kicker">Your roster</p>
      <h2>Add a Bot or space</h2>
      <p className="body">
        There is no official Grok Bot export yet. Type the bots and group chats from your sidebar.
      </p>
      <label className="field">
        <span>Kind</span>
        <select value={kind} onChange={(event) => setKind(event.target.value as NodeKind)}>
          {NODE_KINDS.map((item) => (
            <option key={item} value={item}>
              {KIND_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Casey" />
      </label>
      <label className="field">
        <span>Title / job</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Chief of Staff"
        />
      </label>
      <label className="field">
        <span>Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as NodeStatus)}>
          {NODE_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABEL[item]}
            </option>
          ))}
        </select>
      </label>
      {kind !== "human" && humansAndBots.length > 0 && (
        <label className="field">
          <span>Reports to</span>
          <select value={reportsTo} onChange={(event) => setReportsTo(event.target.value)}>
            <option value="">None</option>
            {humansAndBots.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {kind === "bot" && groups.length > 0 && (
        <label className="field">
          <span>Member of space</span>
          <select value={memberOf} onChange={(event) => setMemberOf(event.target.value)}>
            <option value="">None</option>
            {groups.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>
      <button
        type="button"
        className="btn"
        disabled={!name.trim()}
        onClick={() => {
          onAdd(
            addNode(snapshot, {
              name,
              title,
              kind,
              status,
              notes,
              reportsTo: kind === "human" ? undefined : reportsTo || undefined,
              memberOf: kind === "bot" ? memberOf || undefined : undefined,
            }),
          );
          setName("");
          setTitle("");
          setNotes("");
        }}
      >
        Add to map
      </button>

      <h3>Connect two nodes</h3>
      <label className="field">
        <span>From</span>
        <select value={linkFrom} onChange={(event) => setLinkFrom(event.target.value)}>
          {snapshot.nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>To</span>
        <select value={linkTo} onChange={(event) => setLinkTo(event.target.value)}>
          {snapshot.nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Link</span>
        <select value={linkKind} onChange={(event) => setLinkKind(event.target.value as EdgeKind)}>
          {EDGE_KINDS.map((item) => (
            <option key={item} value={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={!linkFrom || !linkTo || linkFrom === linkTo}
        onClick={() => onLink(addLink(snapshot, { from: linkFrom, to: linkTo, kind: linkKind }))}
      >
        Add link
      </button>
    </div>
  );
}

function MermaidPanel({ current }: { current: string }) {
  return (
    <div className="stack">
      <p className="kicker">Export</p>
      <h2>Mermaid flowchart</h2>
      <p className="body">Copy this into a chat or doc. The map is the product.</p>
      <div className="chip-row">
        <button
          type="button"
          className="chip"
          onClick={() => void navigator.clipboard.writeText(current)}
        >
          Copy source
        </button>
      </div>
      <MermaidView source={current} />
      <pre className="codeblock">{current}</pre>
    </div>
  );
}

function ConnectPanel({
  token,
  onToken,
}: {
  token: string;
  onToken: (value: string) => void;
}) {
  return (
    <div className="stack">
      <p className="kicker">Later</p>
      <h2>Chief of Staff push</h2>
      <p className="body">
        When you want Casey to update the map, give them this site or the MCP URL. Analyze is parked
        until you add an xAI key.
      </p>
      <label className="field">
        <span>Ingest token</span>
        <input value={token} onChange={(event) => onToken(event.target.value)} />
      </label>
      <pre className="codeblock">{`GET  /api/orgs/${DEFAULT_ORG_ID}
POST /api/orgs/${DEFAULT_ORG_ID}/snapshot
GET  /api/orgs/${DEFAULT_ORG_ID}/mermaid

MCP  /api/mcp
Authorization: Bearer ${token}

tools
  push_org_snapshot
  get_org_view`}</pre>
    </div>
  );
}
