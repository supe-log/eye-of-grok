"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Industry } from "@/lib/harness-types";
import { normalizeOrgId } from "@/lib/org-id";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const INDUSTRY_OPTIONS: Array<{ value: Industry; label: string; tools: string }> = [
  { value: "insurance_agency", label: "Insurance agency", tools: "EZLynx, Gmail, Google Drive" },
  { value: "small_business", label: "Other small business", tools: "Gmail, HubSpot, QuickBooks" },
];

export function StartIntake() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<Industry>("insurance_agency");
  const [teamSize, setTeamSize] = useState(5);
  const [tools, setTools] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [rules, setRules] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  const slug = normalizeOrgId(businessName);
  const ready = slug.length >= 2 && !busy;
  const toolHint = INDUSTRY_OPTIONS.find((option) => option.value === industry)?.tools ?? "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    setTaken(null);
    const response = await fetch("/api/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orgId: slug,
        intake: {
          businessName: businessName.trim(),
          industry,
          teamSize,
          tools: tools.split(",").map((tool) => tool.trim()).filter(Boolean),
          painPoints,
          rules,
        },
      }),
    });
    if (response.ok) {
      router.push(`/u/${slug}/team`);
      return;
    }
    setBusy(false);
    if (response.status === 401) {
      setTaken(slug);
      return;
    }
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? `Request failed (${response.status})`);
  }

  return (
    <main className="share-shell">
      <header className="share-brand">
        <div>
          <Logo href="/" />
          <span className="brand-sub">Quick start · a Grok Bot team built for your business</span>
        </div>
        <ThemeToggle />
      </header>

      <form className="share-card stack" onSubmit={(event) => void submit(event)}>
        <p className="kicker">Two minutes</p>
        <h1>Tell us about the business. We design the Bot team.</h1>
        <p className="body">
          You get a Chief of Staff plus specialists, each with rules, skills, and routines
          that start switched off. One paste into Grok Bot builds it. Your feedback trains it
          every week, and nothing changes without your yes.
        </p>

        <label className="field">
          <span>Business name</span>
          <input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Lone Star Insurance Agency"
            autoComplete="organization"
            required
          />
        </label>
        <p className="muted">
          Team console: <code>/u/{slug || "your-business"}/team</code>
        </p>

        <div className="intake-row">
          <label className="field">
            <span>Industry</span>
            <select value={industry} onChange={(event) => setIndustry(event.target.value as Industry)}>
              {INDUSTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>People on the team</span>
            <input
              type="number"
              min={1}
              max={500}
              value={teamSize}
              onChange={(event) => setTeamSize(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>
        </div>

        <label className="field">
          <span>Tools you use (comma separated)</span>
          <input value={tools} onChange={(event) => setTools(event.target.value)} placeholder={toolHint} />
        </label>

        <label className="field">
          <span>What slips today?</span>
          <textarea
            rows={3}
            value={painPoints}
            onChange={(event) => setPainPoints(event.target.value)}
            placeholder="Renewals slip. COI requests pile up. Leads wait a day for a reply."
          />
        </label>

        <label className="field">
          <span>House rules for every Bot (one per line)</span>
          <textarea
            rows={3}
            value={rules}
            onChange={(event) => setRules(event.target.value)}
            placeholder={"Never email a client after 7pm\nAlways cc the producer of record"}
          />
        </label>

        {error ? <p className="panel-error">{error}</p> : null}
        {taken ? (
          <p className="panel-error">
            <code>{taken}</code> already has a team. <Link href={`/u/${taken}/team`}>Open its console</Link>{" "}
            or pick another name.
          </p>
        ) : null}

        <div className="chip-row">
          <button type="submit" className="btn" disabled={!ready}>
            {busy ? "Designing…" : "Design my Bot team"}
          </button>
          <Link className="btn btn-ghost" href="/u/demo-insurance-agency/team">
            See a demo agency
          </Link>
        </div>
      </form>
    </main>
  );
}
