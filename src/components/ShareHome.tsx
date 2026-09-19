"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PublicGallery } from "@/components/PublicGallery";
import { readStoredIngestToken, writeStoredIngestToken } from "@/lib/client-token";
import type { OrgGalleryCard } from "@/lib/gallery";
import { isReservedOrgId, normalizeOrgId } from "@/lib/org-id";

type ClaimResponse = {
  orgId?: string;
  preferredOrgId?: string;
  created?: boolean;
  alreadyClaimed?: boolean;
  yours?: boolean;
  token?: string | null;
  speak?: string | null;
  prompt?: string | null;
  mapUrl?: string;
  snapshotUrl?: string;
  hint?: string;
  error?: string;
  suggestions?: string[];
  suggestedOrgId?: string | null;
};

export function ShareHome({ initialGallery }: { initialGallery: OrgGalleryCard[] }) {
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [pastedToken, setPastedToken] = useState("");
  const [copied, setCopied] = useState<"line" | "full" | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [speak, setSpeak] = useState("");
  const [full, setFull] = useState("");
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [claimedOrgId, setClaimedOrgId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [gallery, setGallery] = useState(initialGallery);
  const router = useRouter();
  const slug = useMemo(() => normalizeOrgId(name), [name]);
  const ready = slug.length >= 2;
  const reserved = ready && isReservedOrgId(slug);
  const mapSlug = claimedOrgId || slug;

  async function refreshGallery() {
    const res = await fetch("/api/gallery", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { orgs?: OrgGalleryCard[] };
    if (body.orgs) setGallery(body.orgs);
  }

  async function claimAndLoad(orgId = slug): Promise<ClaimResponse | null> {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const stored = readStoredIngestToken(orgId);
      const token = pastedToken.trim() || stored || undefined;
      const res = await fetch("/api/orgs/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: name.trim(), orgId, anonymous }),
      });
      const body = (await res.json()) as ClaimResponse;
      setSuggestions(body.suggestions ?? []);
      if (!res.ok && !body.orgId) {
        setError(body.hint || body.error || `Claim failed (${res.status})`);
        return null;
      }
      if (body.token && body.orgId) {
        writeStoredIngestToken(body.orgId, body.token);
        setRevealedToken(body.token);
        setClaimedOrgId(body.orgId);
      }
      if (body.speak) setSpeak(body.speak);
      if (body.prompt) setFull(body.prompt);
      if (body.created && body.orgId) {
        const diverted = body.preferredOrgId && body.orgId !== body.preferredOrgId;
        setMessage(
          diverted
            ? `/${body.preferredOrgId} was taken. Claimed /u/${body.orgId}. The prompt writes only this slug.`
            : `Claimed /u/${body.orgId}. Paste the prompt into your Chief of Staff — they POST only this map.`,
        );
        void refreshGallery();
      } else if (body.yours && body.orgId) {
        setClaimedOrgId(body.orgId);
        setMessage(`This browser already has the write token for /u/${body.orgId}.`);
      } else if (body.alreadyClaimed || body.error === "reserved_org_id") {
        setError(
          body.hint ||
            `/${body.orgId} is taken and public. Browse it, or claim ${body.suggestedOrgId ?? "the next numbered slug"}.`,
        );
      }
      return body;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copy(kind: "line" | "full", orgId = slug) {
    const result = await claimAndLoad(orgId);
    const text = kind === "line" ? result?.speak : result?.prompt;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main className="share-shell">
      <header className="share-brand">
        <span className="brand-mark">Eye of Grok</span>
        <span className="brand-sub">Canvas map · one paste into Chief of Staff</span>
      </header>

      <section className="share-card">
        <p className="kicker">New users · 20 seconds</p>
        <h1>Type your name. Paste one message. Open the fleet canvas.</h1>
        <p className="body">
          No xAI key. No Grok Bot login. Type a name to claim a public slug, copy
          the Chief of Staff message, and paste it into that account. The Bot
          POSTs bots, groups, statuses, and tool names. This site draws a flat
          reporting-line canvas — the same shape as a Cursor canvas. Maps are
          public to read; only the write token stays secret.
        </p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSpeak("");
              setFull("");
              setRevealedToken(null);
              setClaimedOrgId(null);
              setSuggestions([]);
              setError(null);
              setMessage(null);
            }}
            placeholder="Logan May"
            autoComplete="off"
          />
        </label>
        <p className="muted">
          Preferred map: <code>/u/{slug || "your-name"}</code>
          {reserved ? " · reserved (Logan demo / system) — we will offer a numbered slug" : ""}
          {claimedOrgId && claimedOrgId !== slug ? ` · writing to /u/${claimedOrgId}` : ""}
        </p>
        <label className="toggle">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
          />
          List as anonymous in the public gallery
        </label>

        <div className="chip-row">
          <button
            type="button"
            className="btn"
            disabled={!ready || busy}
            onClick={() => void copy("line")}
          >
            {copied === "line" ? "Copied" : busy ? "Claiming…" : "Copy Chief of Staff message"}
          </button>
          {ready ? (
            <Link
              className="btn btn-ghost"
              href={`/u/${mapSlug}`}
              onClick={(event) => {
                event.preventDefault();
                void (async () => {
                  if (claimedOrgId) {
                    router.push(`/u/${claimedOrgId}`);
                    return;
                  }
                  const result = await claimAndLoad(slug);
                  const dest =
                    result?.created || result?.yours ? result.orgId : slug;
                  router.push(`/u/${dest || slug}`);
                })();
              }}
            >
              Open my map
            </Link>
          ) : (
            <span className="btn btn-ghost" aria-disabled="true">
              Open my map
            </span>
          )}
        </div>

        {message && <p className="share-ok">{message}</p>}
        {error && <p className="panel-error">{error}</p>}
        {suggestions.length > 0 && !revealedToken && (
          <div className="chip-row">
            {suggestions.map((option) => (
              <button
                key={option}
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => void copy("line", option)}
              >
                Claim /u/{option}
              </button>
            ))}
            <Link className="btn btn-ghost" href={`/u/${slug}`}>
              Browse /u/{slug}
            </Link>
          </div>
        )}
        {revealedToken && (
          <p className="muted">
            Write token (also inside the prompt): <code>{revealedToken}</code>
          </p>
        )}
        {speak && <pre className="codeblock">{speak}</pre>}

        <label className="field">
          <span>Already claimed on another device? Paste that org&apos;s token</span>
          <input
            value={pastedToken}
            onChange={(event) => setPastedToken(event.target.value)}
            placeholder="eog_…"
            autoComplete="off"
          />
        </label>
      </section>

      <section className="share-card">
        <h2>Public layouts</h2>
        <p className="muted">
          Sharing setup (bots, jobs, rooms) is low risk, so maps are public. A Chief of Staff only
          needs its own slug + token from the copy prompt. Logan&apos;s demo stays at{" "}
          <Link href="/u/mine">/u/mine</Link> — new people claim their own slug.
        </p>
        <PublicGallery orgs={gallery} />
      </section>

      <section className="share-card">
        <h2>What the Bot should send</h2>
        <ul className="share-steps">
          <li>Every Bot — name, job, active / stale / hidden / deprecated / duplicate</li>
          <li>Every group chat and sidebar section</li>
          <li>Who reports to whom</li>
          <li>Account tools, plugins, and MCP names (not keys)</li>
        </ul>
        <p className="muted">
          The copied message includes <code>POST /api/orgs/&lt;your-slug&gt;/snapshot</code> and
          that org&apos;s bearer — not Logan&apos;s demo token. Optional longer contract:
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!ready || busy}
          onClick={() => void copy("full", claimedOrgId || slug)}
        >
          {copied === "full" ? "Copied" : "Copy full JSON prompt"}
        </button>
        {full && <pre className="codeblock">{full}</pre>}
      </section>

      <p className="share-foot">
        <Link href="/u/mine">Logan May demo map</Link>
        {" · "}
        Public to read. Writes need that org&apos;s token.
      </p>
    </main>
  );
}
