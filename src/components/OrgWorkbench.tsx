"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CASEY_LOCAL_PROMPT,
  LOCAL_SNAPSHOT_URL,
  createBotSharePrompt,
  createBotSpeakLine,
  mapUrl,
  mcpUrl,
  snapshotPostUrl,
} from "@/lib/casey-prompt";
import { addLink, addNode, removeNode, setNodeStatus } from "@/lib/graph-edit";
import type { OrgCanvasView } from "@/lib/layout-graph";
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
  type OrgRevision,
  type OrgSnapshot,
} from "@/lib/types";
import { KIND_LABEL, STATUS_COLOR, STATUS_LABEL, relativeTime } from "@/lib/status-style";
import { readStoredIngestToken, writeStoredIngestToken } from "@/lib/client-token";
import { MermaidView } from "./MermaidView";
import { OrgCanvas } from "./OrgCanvas";

type Tab = "inspect" | "edit" | "mermaid" | "live";

export function OrgWorkbench({
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
  const [view, setView] = useState<OrgCanvasView>("reports");
  const [tab, setTab] = useState<Tab>("live");
  const [ingestToken, setIngestToken] = useState(() => {
    const stored = readStoredIngestToken(initialSnapshot.orgId);
    if (stored) return stored;
    if (typeof window === "undefined") return "";
    const local = /localhost|127\.0\.0\.1/.test(window.location.hostname);
    if (initialSnapshot.orgId === DEFAULT_ORG_ID && local) return "hackathon-demo";
    return "";
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [livePulse, setLivePulse] = useState(false);
  const lastPushedAt = useRef(initialSnapshot.pushedAt);
  const orgId = snapshot.orgId;

  useEffect(() => {
    const timer = window.setInterval(() => {
      void (async () => {
        const res = await fetch(`/api/orgs/${orgId}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as OrgSnapshot;
        if (next.pushedAt === lastPushedAt.current) return;
        lastPushedAt.current = next.pushedAt;
        setSnapshot(next);
        setLivePulse(true);
        window.setTimeout(() => setLivePulse(false), 1200);
      })();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [orgId]);

  const persist = useCallback(
    async (next: OrgSnapshot) => {
      setBusy(true);
      setSaveMsg(null);
      try {
        const res = await fetch(`/api/orgs/${orgId}/snapshot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(ingestToken ? { Authorization: `Bearer ${ingestToken}` } : {}),
          },
          body: JSON.stringify(next),
        });
        const body = (await res.json()) as OrgSnapshot & { detail?: string; error?: string };
        if (!res.ok || !body.nodes) {
          setSaveMsg(body.detail || body.error || `Save failed (${res.status})`);
          return;
        }
        lastPushedAt.current = body.pushedAt;
        setSnapshot(body);
        setSaveMsg(`Saved ${body.nodes.length} nodes`);
      } catch (error) {
        setSaveMsg(error instanceof Error ? error.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [ingestToken, orgId],
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
    const res = await fetch(`/api/orgs/${orgId}?reset=1`, { cache: "no-store" });
    if (!res.ok) {
      setLoadError(`Could not reset (${res.status})`);
      return;
    }
    const next = (await res.json()) as OrgSnapshot;
    lastPushedAt.current = next.pushedAt;
    setSnapshot(next);
    setSelectedId(next.nodes[0]?.id ?? null);
    setSaveMsg("Starter reset");
  }, [orgId]);

  const selected = snapshot.nodes.find((node) => node.id === selectedId) ?? null;
  const capacity = snapshotCapacity(snapshot);
  const mermaid = snapshotToMermaid(snapshot);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Link className="brand-mark" href="/" style={{ color: "inherit", textDecoration: "none" }}>
            Eye of Grok
          </Link>
          <span className="brand-sub">
            {snapshot.orgId} · shareable{livePulse ? " · incoming" : " · live"}
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
          <Gauge label="Source" value={snapshot.source.replaceAll("_", " ")} />
          <Gauge
            label="Tools"
            value={snapshot.tools?.length ? String(snapshot.tools.length) : "—"}
          />
        </div>
        <div className="top-actions">
          <div className="view-pills">
            <button
              type="button"
              className="pill"
              data-on={view === "reports"}
              onClick={() => setView("reports")}
            >
              Reporting line
            </button>
            <button
              type="button"
              className="pill"
              data-on={view === "spaces"}
              onClick={() => setView("spaces")}
            >
              Spaces
            </button>
          </div>
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
      {snapshot.tools && snapshot.tools.length > 0 && (
        <div className="chip-row">
          {snapshot.tools.map((tool) => (
            <span key={tool} className="chip">
              {tool}
            </span>
          ))}
        </div>
      )}

      <section className="stage">
        <div className="canvas">
          <OrgCanvas
            snapshot={snapshot}
            view={view}
            hygiene={hygiene}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setTab("inspect");
            }}
          />
        </div>

        <aside className="rail">
          <nav className="tabs">
            {(
              [
                ["live", "Live"],
                ["inspect", "Inspect"],
                ["edit", "Edit"],
                ["mermaid", "Mermaid"],
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
            {tab === "live" && (
              <LivePanel
                snapshot={snapshot}
                pulse={livePulse}
                token={ingestToken}
                onToken={setIngestToken}
                onRestore={(next) => {
                  lastPushedAt.current = next.pushedAt;
                  setSnapshot(next);
                  setSaveMsg("Restored snapshot");
                }}
              />
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

function LivePanel({
  snapshot,
  pulse,
  token,
  onToken,
  onRestore,
}: {
  snapshot: OrgSnapshot;
  pulse: boolean;
  token: string;
  onToken: (value: string) => void;
  onRestore: (next: OrgSnapshot) => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const owner =
    snapshot.nodes.find((node) => node.kind === "human")?.name ?? snapshot.orgId;
  const prompt =
    origin && token
      ? createBotSharePrompt({
          origin,
          orgId: snapshot.orgId,
          token,
          ownerName: owner,
        })
      : CASEY_LOCAL_PROMPT;
  const speak =
    origin && token
      ? createBotSpeakLine({ origin, orgId: snapshot.orgId, token })
      : CASEY_LOCAL_PROMPT;
  const loopback = /localhost|127\.0\.0\.1/.test(origin);
  const [revisions, setRevisions] = useState<OrgRevision[]>([]);
  const [restoreBusy, setRestoreBusy] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/orgs/${snapshot.orgId}/revisions`, { cache: "no-store" })
      .then((res) => res.json() as Promise<{ revisions?: OrgRevision[] }>)
      .then((body) => {
        if (!cancelled) setRevisions(body.revisions ?? []);
      })
      .catch(() => {
        if (!cancelled) setRevisions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot.orgId, snapshot.pushedAt]);

  return (
    <div className="stack">
      <p className="kicker">Share with a Grok Bot</p>
      <h2>{pulse ? "Roster just arrived" : "Hand this map to a Bot"}</h2>
      <p className="body">
        Map <code>{origin ? mapUrl(origin, snapshot.orgId) : `/u/${snapshot.orgId}`}</code>{" "}
        · {snapshot.nodes.length} nodes · {snapshot.source.replaceAll("_", " ")} ·{" "}
        {relativeTime(snapshot.pushedAt)}
      </p>
      <p className="callout">
        Paste the prompt into any Chief of Staff. They POST{" "}
        <code>
          {origin ? snapshotPostUrl(origin, snapshot.orgId) : `/api/orgs/${snapshot.orgId}/snapshot`}
        </code>{" "}
        {token ? (
          <>
            with <code>Authorization: Bearer {token}</code>
          </>
        ) : (
          <>after you paste this org&apos;s write token below</>
        )}
        . MCP: <code>{origin ? mcpUrl(origin) : "/api/mcp"}</code>
      </p>
      <button
        type="button"
        className="btn"
        disabled={!token}
        onClick={() => void navigator.clipboard.writeText(speak)}
      >
        Copy Chief of Staff message
      </button>
      <pre className="codeblock">{speak}</pre>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void navigator.clipboard.writeText(prompt)}
      >
        Copy full JSON prompt
      </button>
      {loopback && (
        <>
          <h3>This Mac only (no bearer)</h3>
          <p className="muted">
            Cloud MCP cannot see localhost. On this laptop, a Bot with local egress
            can POST <code>{LOCAL_SNAPSHOT_URL}</code> into Logan&apos;s <code>mine</code> map.
          </p>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void navigator.clipboard.writeText(CASEY_LOCAL_PROMPT)}
          >
            Copy Logan local prompt
          </button>
        </>
      )}
      <label className="field">
        <span>Write token for this org (from claim — not a global demo secret)</span>
        <input
          value={token}
          onChange={(event) => {
            onToken(event.target.value);
            if (event.target.value.trim()) {
              writeStoredIngestToken(snapshot.orgId, event.target.value.trim());
            }
          }}
          placeholder="eog_… or INGEST_TOKEN for /u/mine"
        />
      </label>
      <p className="muted">
        <Link href="/">Claim a different slug</Link>
      </p>
      {revisions.length > 0 && (
        <>
          <h3>Saved snapshots</h3>
          <p className="muted">
            Durable in Neon. Anyone with this slug sees the same latest map after
            they leave and come back.
          </p>
          <ul className="roster">
            {revisions.map((revision) => (
              <li key={revision.id}>
                <button
                  type="button"
                  disabled={restoreBusy !== null}
                  onClick={() => {
                    if (revision.id <= 0) return;
                    setRestoreBusy(revision.id);
                    void (async () => {
                      try {
                        const res = await fetch(`/api/orgs/${snapshot.orgId}/revisions`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ revisionId: revision.id }),
                        });
                        const body = (await res.json()) as OrgSnapshot & {
                          detail?: string;
                        };
                        if (!res.ok || !body.nodes) return;
                        onRestore(body);
                      } finally {
                        setRestoreBusy(null);
                      }
                    })();
                  }}
                >
                  <i />
                  <span>
                    {relativeTime(revision.pushedAt)} · {revision.nodeCount} nodes
                  </span>
                  <em>
                    {restoreBusy === revision.id
                      ? "Restoring"
                      : revision.source.replaceAll("_", " ")}
                  </em>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
