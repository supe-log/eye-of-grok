"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getIngestToken } from "@/lib/auth";
import { normalizeOrgId } from "@/lib/org-id";
import { createBotSharePrompt, createBotSpeakLine } from "@/lib/share-prompt";
import { Logo } from "./Logo";

export function ShareHome() {
  const [name, setName] = useState("");
  const [copied, setCopied] = useState<"line" | "full" | null>(null);
  const slug = useMemo(() => normalizeOrgId(name), [name]);
  const ready = slug.length >= 2;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const token = getIngestToken();
  const speak = ready && origin ? createBotSpeakLine({ origin, orgId: slug, token }) : "";
  const full =
    ready && origin
      ? createBotSharePrompt({ origin, orgId: slug, token, ownerName: name.trim() })
      : "";

  async function copy(kind: "line" | "full", text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <main className="share-shell">
      <header className="share-brand">
        <Logo href="/" />
        <span className="brand-sub">Canvas map · one paste into Chief of Staff</span>
      </header>

      <section className="share-card">
        <p className="kicker">New users · 20 seconds</p>
        <h1>Type your name. Paste one message. Open the fleet canvas.</h1>
        <p className="body">
          No xAI key. No Grok Bot login. Your Chief of Staff already knows the
          sidebar — it POSTs bots, groups, statuses, and tool names. This site
          draws a flat reporting-line diagram, the same shape as a Cursor canvas.
        </p>

        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Logan May"
            autoComplete="off"
          />
        </label>
        <p className="muted">
          Your map: <code>/u/{slug || "your-name"}</code>
        </p>

        <div className="chip-row">
          <button
            type="button"
            className="btn"
            disabled={!ready || !speak}
            onClick={() => void copy("line", speak)}
          >
            {copied === "line" ? "Copied" : "Copy Chief of Staff message"}
          </button>
          {ready ? (
            <Link className="btn btn-ghost" href={`/u/${slug}`}>
              Open my map
            </Link>
          ) : (
            <span className="btn btn-ghost" aria-disabled="true">
              Open my map
            </span>
          )}
        </div>

        {ready && speak && (
          <pre className="codeblock">{speak}</pre>
        )}
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
          Paste the short message above into Chief of Staff on phone or desktop.
          Optional longer contract:
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!ready || !full}
          onClick={() => void copy("full", full)}
        >
          {copied === "full" ? "Copied" : "Copy full JSON prompt"}
        </button>
      </section>

      <p className="share-foot">
        <Link href="/u/mine">Logan May demo map</Link>
        {" · "}
        Bearer <code>hackathon-demo</code>
      </p>
    </main>
  );
}
