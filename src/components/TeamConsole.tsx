"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FEEDBACK_TAGS,
  type FeedbackTag,
  type HarnessState,
  type PlanBot,
  type Proposal,
} from "@/lib/harness-types";
import { createSetupPrompt } from "@/lib/plan-export";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const AUTONOMY_LABEL: Record<PlanBot["autonomy"], string> = {
  draft_only: "Draft only",
  ask_first: "Ask first",
  autonomous: "Autonomous",
};

const STATUS_LABEL: Record<Proposal["status"], string> = {
  open: "Needs your yes",
  approved: "Approved · waiting for Chief of Staff",
  rejected: "Rejected",
  applied: "Live in Grok Bot",
};

export function TeamConsole({
  initialState,
  origin,
  token,
}: {
  initialState: HarnessState;
  origin: string;
  token: string;
}) {
  const [state, setState] = useState(initialState);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { plan } = state;
  const api = `/api/orgs/${plan.orgId}`;

  const setupPrompt = useMemo(
    () => createSetupPrompt({ origin, plan, token }),
    [origin, plan, token],
  );

  const scoreByBot = useMemo(() => {
    const scores = new Map<string, { up: number; down: number }>();
    for (const entry of state.feedback) {
      if (!entry.botId) continue;
      const score = scores.get(entry.botId) ?? { up: 0, down: 0 };
      score[entry.rating] += 1;
      scores.set(entry.botId, score);
    }
    return scores;
  }, [state.feedback]);

  const proposals = [...state.proposals].reverse();
  const open = proposals.filter((item) => item.status === "open");
  const decided = proposals.filter((item) => item.status !== "open").slice(0, 8);
  const pendingFeedback = state.feedback.filter((entry) => !entry.retroAt).length;

  async function reload() {
    const response = await fetch(`${api}/team`, { cache: "no-store" });
    if (response.ok) setState((await response.json()) as HarnessState);
  }

  async function post(key: string, path: string, body?: unknown): Promise<Response | null> {
    setBusy(key);
    setNotice(null);
    try {
      const response = await fetch(`${api}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice(detail?.error ?? `Request failed (${response.status})`);
        return null;
      }
      await reload();
      return response;
    } finally {
      setBusy(null);
    }
  }

  async function runRetro() {
    const response = await post("retro", "/retro");
    if (!response) return;
    const { created } = (await response.json()) as { created: number };
    setNotice(
      created
        ? `Retro proposed ${created} change(s). Review them below.`
        : "Retro found nothing to change. More feedback helps.",
    );
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(setupPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="team-shell">
      <header className="share-brand">
        <div>
          <Logo href="/" />
          <span className="brand-sub">
            {plan.intake.businessName} · team plan v{plan.version}
          </span>
        </div>
        <div className="chip-row">
          <Link className="btn btn-ghost" href={`/u/${plan.orgId}`}>
            Open map
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {notice ? <p className="callout">{notice}</p> : null}

      <section className="share-card stack">
        <p className="kicker">Step 1 · Install</p>
        <h2>Paste this into a new Bot in Grok Bot.</h2>
        <p className="body">
          It becomes your Chief of Staff. It reads this plan, builds every Bot and group chat,
          leaves routines off, and pushes the real roster back to your map. You can also publish
          it as a Grok Bot template (Settings → Share as Template) so a teammate installs it with one link.
        </p>
        <pre className="codeblock">{setupPrompt || "Loading…"}</pre>
        <div className="chip-row">
          <button type="button" className="btn" disabled={!setupPrompt} onClick={() => void copyPrompt()}>
            {copied ? "Copied" : "Copy setup prompt"}
          </button>
          <a className="btn btn-ghost" href={`${api}/plan`} target="_blank" rel="noreferrer">
            Plan JSON
          </a>
          <a className="btn btn-ghost" href={`${api}/plan?format=recipes`} target="_blank" rel="noreferrer">
            Template recipes
          </a>
        </div>
      </section>

      <section className="stack">
        <div className="team-head">
          <div>
            <p className="kicker">Step 2 · Rate the work</p>
            <h2>{plan.bots.length} Bots · {plan.groups.length} group chats</h2>
          </div>
          <p className="muted">Every thumbs-down with a reason becomes a lesson. Three clean thumbs-up earn more autonomy.</p>
        </div>
        <div className="team-grid">
          {plan.bots.map((bot) => (
            <BotCard
              key={bot.id}
              bot={bot}
              score={scoreByBot.get(bot.id)}
              busy={busy === bot.id}
              onFeedback={(rating, tag, comment) =>
                void post(bot.id, "/feedback", { botId: bot.id, rating, tag, comment, source: "owner" })
              }
            />
          ))}
        </div>
        <GapForm
          busy={busy === "gap"}
          onSubmit={(comment) =>
            void post("gap", "/feedback", { rating: "down", tag: "missing", comment, source: "owner" })
          }
        />
      </section>

      <section className="share-card stack">
        <div className="team-head">
          <div>
            <p className="kicker">Step 3 · Improve</p>
            <h2>Weekly retro</h2>
          </div>
          <button type="button" className="btn" disabled={busy === "retro"} onClick={() => void runRetro()}>
            {busy === "retro" ? "Running…" : `Run retro (${pendingFeedback} new feedback)`}
          </button>
        </div>
        <p className="body">
          Your Ops Bot runs this every Friday. Approved changes update the plan; your Chief of Staff applies
          them in Grok Bot and marks them live. Anything that adds powers is flagged.
        </p>

        {open.length === 0 ? <p className="muted">No open proposals.</p> : null}
        {open.map((item) => (
          <div key={item.id} className="rec">
            <p className="rec-action">
              {item.kind.replace("_", " ")}
              {item.addsPowers ? <span className="power-flag"> · adds powers</span> : null}
            </p>
            <strong>{item.title}</strong>
            <p className="body">{item.why}</p>
            {typeof item.change.rule === "string" ? <p className="muted">New rule: {item.change.rule}</p> : null}
            <div className="chip-row">
              <button
                type="button"
                className="btn"
                disabled={busy === item.id}
                onClick={() => void post(item.id, `/changes/${item.id}`, { decision: "approved" })}
              >
                Approve
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy === item.id}
                onClick={() => void post(item.id, `/changes/${item.id}`, { decision: "rejected" })}
              >
                Reject
              </button>
            </div>
          </div>
        ))}

        {decided.length ? (
          <div className="stack">
            <p className="kicker">Decided</p>
            {decided.map((item) => (
              <p key={item.id} className="muted">
                <span className="status-tag" data-status={item.status}>{STATUS_LABEL[item.status]}</span>{" "}
                {item.title}
              </p>
            ))}
          </div>
        ) : null}

        <div className="stack">
          <p className="kicker">Plan history</p>
          {[...plan.changelog].reverse().map((entry) => (
            <p key={entry.version} className="muted">
              v{entry.version} · {new Date(entry.at).toLocaleString()} · {entry.summary}
            </p>
          ))}
        </div>
      </section>

      <section className="share-card stack">
        <p className="kicker">Hard rules for every Bot</p>
        <ul className="rule-list">
          {plan.hardRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function BotCard({
  bot,
  score,
  busy,
  onFeedback,
}: {
  bot: PlanBot;
  score?: { up: number; down: number };
  busy: boolean;
  onFeedback: (rating: "up" | "down", tag: FeedbackTag, comment: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<FeedbackTag>("wrong");

  function send(rating: "up" | "down") {
    onFeedback(rating, rating === "up" ? "great" : tag, comment.trim());
    setComment("");
  }

  return (
    <article className="bot-card">
      <div className="bot-card-head">
        <div>
          <strong>{bot.name}</strong>
          <p className="muted">{bot.title}</p>
        </div>
        <span className="status-tag" data-status={bot.autonomy}>{AUTONOMY_LABEL[bot.autonomy]}</span>
      </div>
      <p className="body">{bot.description}</p>
      <details>
        <summary className="muted">
          {bot.rules.length} rules · {bot.skills.length} skills · {bot.routines.length} routines
        </summary>
        <ul className="rule-list">
          {bot.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
          {bot.skills.map((skill) => (
            <li key={skill.name}>Skill: {skill.name}</li>
          ))}
          {bot.routines.map((routine) => (
            <li key={routine.slug}>
              Routine: {routine.name} · {routine.schedule} · off
            </li>
          ))}
        </ul>
      </details>
      <div className="bot-feedback">
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What happened? (optional)"
          aria-label={`Feedback for ${bot.name}`}
        />
        <select value={tag} onChange={(event) => setTag(event.target.value as FeedbackTag)} aria-label="Reason">
          {FEEDBACK_TAGS.filter((value) => value !== "great" && value !== "missing").map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
        <button type="button" className="chip" disabled={busy} onClick={() => send("up")} aria-label="Thumbs up">
          👍 {score?.up ?? 0}
        </button>
        <button type="button" className="chip" disabled={busy} onClick={() => send("down")} aria-label="Thumbs down">
          👎 {score?.down ?? 0}
        </button>
      </div>
    </article>
  );
}

function GapForm({ busy, onSubmit }: { busy: boolean; onSubmit: (comment: string) => void }) {
  const [comment, setComment] = useState("");
  return (
    <form
      className="bot-feedback gap-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!comment.trim()) return;
        onSubmit(comment.trim());
        setComment("");
      }}
    >
      <input
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Something nobody handles? e.g. claims calls, billing questions, review requests"
        aria-label="Missing coverage"
      />
      <button type="submit" className="chip" disabled={busy || !comment.trim()}>
        Report gap
      </button>
    </form>
  );
}
