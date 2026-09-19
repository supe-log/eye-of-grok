"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import { snapshotToFlow, type OrgFlowEdgeData, type OrgFlowNodeData } from "@/lib/layout-graph";
import { snapshotToMermaid } from "@/lib/mermaid";
import { hygieneCandidates, snapshotCapacity } from "@/lib/capacity";
import { DEFAULT_ORG_ID, type AnalyzeResult, type OrgSnapshot } from "@/lib/types";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL, isProblemStatus, relativeTime } from "@/lib/status-style";
import { MermaidView } from "./MermaidView";
import { OrgNode, type OrgFlowNode } from "./OrgNode";

const nodeTypes = { org: OrgNode };
const ORG_ID = DEFAULT_ORG_ID;

type Tab = "inspect" | "hygiene" | "onboard" | "push" | "mermaid" | "connect";

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
  const [selectedId, setSelectedId] = useState<string | null>("bot-cos");
  const [hygiene, setHygiene] = useState(false);
  const [tab, setTab] = useState<Tab>("inspect");
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [ingestText, setIngestText] = useState(() =>
    JSON.stringify(initialSnapshot, null, 2),
  );
  const [ingestToken, setIngestToken] = useState("hackathon-demo");
  const [ingestMsg, setIngestMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (reset = false) => {
    setLoadError(null);
    const url = reset ? `/api/orgs/${ORG_ID}?reset=1` : `/api/orgs/${ORG_ID}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      setLoadError(`Could not load org (${res.status})`);
      return;
    }
    const next = (await res.json()) as OrgSnapshot;
    setSnapshot(next);
    setAnalysis(null);
    setIngestText(JSON.stringify(next, null, 2));
  }, []);

  const recommendedIds = useMemo(() => {
    if (!analysis) return new Set<string>();
    return new Set(
      analysis.recommendations
        .filter((rec) => rec.action !== "keep")
        .flatMap((rec) => rec.nodeIds),
    );
  }, [analysis]);

  const flow = useMemo(() => {
    if (!snapshot) return { nodes: [] as Node<OrgFlowNodeData>[], edges: [] as Edge<OrgFlowEdgeData>[] };
    const laid = snapshotToFlow(snapshot);
    const overstaffed = new Set(snapshotCapacity(snapshot).overstaffedGroupIds);
    return {
      nodes: laid.nodes.map((node) => {
        const status = node.data.orgNode.status;
        const flagged =
          isProblemStatus(status) ||
          overstaffed.has(node.id) ||
          recommendedIds.has(node.id);
        const dimmed = hygiene && !flagged;
        return {
          ...node,
          data: {
            ...node.data,
            dimmed,
            recommended: hygiene || Boolean(analysis) ? flagged : false,
          },
        };
      }),
      edges: laid.edges,
    };
  }, [snapshot, hygiene, recommendedIds, analysis]);

  const selected = snapshot?.nodes.find((node) => node.id === selectedId) ?? null;
  const capacity = snapshot ? snapshotCapacity(snapshot) : null;
  const mermaid = snapshot ? snapshotToMermaid(snapshot) : "";
  const candidates = snapshot ? hygieneCandidates(snapshot) : [];

  async function runAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/orgs/${ORG_ID}/analyze`, { method: "POST" });
      if (!res.ok) {
        setAnalyzeError(`Analyze failed (${res.status})`);
        return;
      }
      const next = (await res.json()) as AnalyzeResult;
      setAnalysis(next);
      setHygiene(true);
      setTab("hygiene");
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : "Analyze failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function pushSnapshot() {
    setBusy(true);
    setIngestMsg(null);
    try {
      const parsed = JSON.parse(ingestText) as unknown;
      const res = await fetch(`/api/orgs/${ORG_ID}/snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ingestToken}`,
        },
        body: JSON.stringify(parsed),
      });
      const body = (await res.json()) as {
        orgId?: string;
        pushedAt?: string;
        nodes?: OrgSnapshot["nodes"];
        error?: string;
        detail?: string;
      };
      if (!res.ok || !body.nodes || !body.pushedAt) {
        setIngestMsg(body.detail || body.error || `Push failed (${res.status})`);
        return;
      }
      const saved = body as OrgSnapshot;
      setSnapshot(saved);
      setAnalysis(null);
      setIngestMsg(`Pushed ${saved.nodes.length} nodes at ${saved.pushedAt}`);
    } catch (error) {
      setIngestMsg(error instanceof Error ? error.message : "Invalid JSON");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <main className="shell">
        <p className="panel-error">{loadError}</p>
        <button type="button" className="btn" onClick={() => void load()}>
          Retry
        </button>
      </main>
    );
  }

  if (!capacity) {
    return (
      <main className="shell">
        <p className="muted">Loading roster…</p>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Roster</span>
          <span className="brand-sub">Grok Bot org map</span>
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
          <Gauge label="Pushed" value={relativeTime(snapshot.pushedAt)} />
          <Gauge label="Source" value={snapshot.source.replaceAll("_", " ")} />
        </div>
        <div className="top-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={hygiene}
              onChange={(event) => setHygiene(event.target.checked)}
            />
            Hygiene
          </label>
          <button type="button" className="btn btn-ghost" onClick={() => void load(true)}>
            Reset fixture
          </button>
          <button type="button" className="btn" disabled={analyzing} onClick={() => void runAnalyze()}>
            {analyzing ? "Asking Grok…" : "Analyze with Grok"}
          </button>
        </div>
      </header>

      <section className="stage">
        <div className="canvas">
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.35}
            maxZoom={1.6}
            onNodeClick={(_event, node) => {
              setSelectedId(node.id);
              setTab("inspect");
            }}
            nodesDraggable={false}
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
                ["hygiene", "Hygiene"],
                ["onboard", "Onboard"],
                ["push", "Push"],
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
              />
            )}
            {tab === "hygiene" && (
              <HygienePanel
                snapshot={snapshot}
                candidates={candidates}
                analysis={analysis}
                analyzeError={analyzeError}
                onSelect={setSelectedId}
              />
            )}
            {tab === "onboard" && (
              <OnboardPanel snapshot={snapshot} analysis={analysis} onSelect={setSelectedId} />
            )}
            {tab === "push" && (
              <PushPanel
                ingestText={ingestText}
                ingestToken={ingestToken}
                ingestMsg={ingestMsg}
                busy={busy}
                onText={setIngestText}
                onToken={setIngestToken}
                onPush={() => void pushSnapshot()}
              />
            )}
            {tab === "mermaid" && (
              <MermaidPanel current={mermaid} lean={analysis?.leanMermaid} />
            )}
            {tab === "connect" && <ConnectPanel token={ingestToken} />}
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
}: {
  snapshot: OrgSnapshot;
  selected: OrgSnapshot["nodes"][number] | null;
  onSelect: (id: string) => void;
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
          <p className="body">{selected.notes ?? "No notes in this snapshot."}</p>
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
              Memory is this Bot&apos;s. Tools and the computer are account-level. Hiding does not pause
              routines. Prefer hide over delete.
            </p>
          )}
          {memberships.length > 0 && (
            <p className="muted">Spaces: {memberships.join(", ")}</p>
          )}
          {members.length > 0 && <p className="muted">Members: {members.join(", ")}</p>}
        </>
      ) : (
        <p className="muted">Click a node to inspect it.</p>
      )}
      <h3>Roster</h3>
      <ul className="roster">
        {snapshot.nodes.map((node) => (
          <li key={node.id}>
            <button type="button" onClick={() => onSelect(node.id)}>
              <i style={{ background: STATUS_COLOR[node.status] }} />
              <span>{node.name}</span>
              <em>{node.title}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HygienePanel({
  snapshot,
  candidates,
  analysis,
  analyzeError,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  candidates: OrgSnapshot["nodes"];
  analysis: AnalyzeResult | null;
  analyzeError: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="stack">
      <p className="kicker">Cleanup candidates</p>
      <h2>Lean the roster</h2>
      <p className="body">
        Recommendations only. Nothing here deletes a Bot. Hide is safer; hidden Bots can still run
        routines.
      </p>
      {analyzeError && <p className="panel-error">{analyzeError}</p>}
      {analysis && (
        <p className="callout">
          Plan from <strong>{analysis.source}</strong>. {analysis.recommendations.length} moves.
        </p>
      )}
      {analysis?.recommendations.map((rec) => (
        <article key={`${rec.action}-${rec.nodeIds.join("-")}`} className="rec">
          <p className="rec-action">{rec.action.replaceAll("_", " ")}</p>
          <p className="body">{rec.why}</p>
          <p className="muted">
            {rec.nodeIds
              .map((id) => snapshot.nodes.find((node) => node.id === id)?.name ?? id)
              .join(" · ")}
          </p>
          <div className="chip-row">
            {rec.nodeIds.map((id) => (
              <button key={id} type="button" className="chip" onClick={() => onSelect(id)}>
                {id}
              </button>
            ))}
          </div>
        </article>
      ))}
      <h3>Status flags</h3>
      <ul className="roster">
        {candidates.map((node) => (
          <li key={node.id}>
            <button type="button" onClick={() => onSelect(node.id)}>
              <i style={{ background: STATUS_COLOR[node.status] }} />
              <span>{node.name}</span>
              <em>{STATUS_LABEL[node.status]}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OnboardPanel({
  snapshot,
  analysis,
  onSelect,
}: {
  snapshot: OrgSnapshot;
  analysis: AnalyzeResult | null;
  onSelect: (id: string) => void;
}) {
  const activeBots = snapshot.nodes.filter(
    (node) => node.kind === "bot" && node.status === "active",
  );
  return (
    <div className="stack">
      <p className="kicker">New human</p>
      <h2>Who to talk to</h2>
      {analysis ? (
        <p className="body">{analysis.onboarding}</p>
      ) : (
        <p className="body">
          Run Analyze to let Grok write this brief. Until then: talk to Casey first, then the named
          specialist for the lane.
        </p>
      )}
      <ul className="roster">
        {activeBots.map((node) => (
          <li key={node.id}>
            <button type="button" onClick={() => onSelect(node.id)}>
              <i style={{ background: STATUS_COLOR[node.status] }} />
              <span>{node.name}</span>
              <em>{node.title}</em>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PushPanel({
  ingestText,
  ingestToken,
  ingestMsg,
  busy,
  onText,
  onToken,
  onPush,
}: {
  ingestText: string;
  ingestToken: string;
  ingestMsg: string | null;
  busy: boolean;
  onText: (value: string) => void;
  onToken: (value: string) => void;
  onPush: () => void;
}) {
  return (
    <div className="stack">
      <p className="kicker">Chief of Staff</p>
      <h2>Push a snapshot</h2>
      <p className="body">
        Same contract the Bot hits. Paste JSON or POST{" "}
        <code> /api/orgs/{DEFAULT_ORG_ID}/snapshot</code> with a bearer token.
      </p>
      <label className="field">
        <span>Ingest token</span>
        <input value={ingestToken} onChange={(event) => onToken(event.target.value)} />
      </label>
      <label className="field">
        <span>Org snapshot JSON</span>
        <textarea value={ingestText} onChange={(event) => onText(event.target.value)} rows={16} />
      </label>
      <button type="button" className="btn" disabled={busy} onClick={onPush}>
        {busy ? "Pushing…" : "Push snapshot"}
      </button>
      {ingestMsg && <p className="callout">{ingestMsg}</p>}
    </div>
  );
}

function MermaidPanel({ current, lean }: { current: string; lean?: string }) {
  const [mode, setMode] = useState<"current" | "lean">("current");
  const source = mode === "lean" && lean ? lean : current;
  return (
    <div className="stack">
      <p className="kicker">Export</p>
      <h2>Mermaid flowchart</h2>
      <p className="body">Interchange view. The map is the product. Paste this into a chat or doc.</p>
      <div className="chip-row">
        <button type="button" className="chip" data-on={mode === "current"} onClick={() => setMode("current")}>
          Current
        </button>
        <button
          type="button"
          className="chip"
          data-on={mode === "lean"}
          disabled={!lean}
          onClick={() => setMode("lean")}
        >
          Lean plan
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => void navigator.clipboard.writeText(source)}
        >
          Copy source
        </button>
      </div>
      <MermaidView source={source} />
      <pre className="codeblock">{source}</pre>
    </div>
  );
}

function ConnectPanel({ token }: { token: string }) {
  return (
    <div className="stack">
      <p className="kicker">Give this to Casey</p>
      <h2>Website + MCP</h2>
      <p className="body">
        Hand the Chief of Staff this site, or attach the MCP URL in chat. It can push the roster,
        read the map, and ask for a lean plan. It cannot delete Bots.
      </p>
      <pre className="codeblock">{`REST
GET  /api/orgs/${DEFAULT_ORG_ID}
POST /api/orgs/${DEFAULT_ORG_ID}/snapshot
GET  /api/orgs/${DEFAULT_ORG_ID}/mermaid
POST /api/orgs/${DEFAULT_ORG_ID}/analyze

MCP  /api/mcp
Authorization: Bearer ${token}

tools
  push_org_snapshot
  get_org_view
  analyze_org`}</pre>
      <p className="callout">
        Grok Bot adds a remote MCP server by asking the Bot in chat with the HTTPS URL. Locally,
        tunnel this app first.
      </p>
    </div>
  );
}
