"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

type Slide = {
  kicker: string;
  title: string;
  lines: string[];
  chips?: string[];
  cta?: { href: string; label: string };
};

const SLIDES: Slide[] = [
  {
    kicker: "Cursor Austin × AITX / Grok Hackathon",
    title: "Eye of Grok",
    lines: [
      "The org chart Grok Bot never shipped.",
      "You write the graph. The site draws it.",
    ],
  },
  {
    kicker: "Problem",
    title: "Grok Bot scales like a company.",
    lines: [
      "No org dashboard shipped.",
      "Cap is 50 Bots + spaces.",
      "Groups are 2–6.",
      "Hide ≠ pause.",
      "No official roster API.",
      "CoS can see the mess. Humans cannot.",
    ],
  },
  {
    kicker: "Product",
    title: "Readout, not a second control plane.",
    lines: [
      "Edit names from the sidebar.",
      "Status colors. Mermaid.",
      "CoS can POST or MCP later.",
      "Nothing fires a Bot. Analyze is parked.",
    ],
    chips: ["bot | group | human", "reports_to | member_of | handoff | shares_context"],
  },
  {
    kicker: "Demo",
    title: "Open. You are Logan.",
    lines: [
      "Edit CoS, specialists, and a space.",
      "Click a node. Mark stale or hidden.",
      "Toggle Flag stale.",
      "Open Mermaid and copy the graph.",
    ],
  },
  {
    kicker: "Remember",
    title: "Hide ≠ pause.",
    lines: [
      "Never auto-delete real Bots.",
      "Readout, not a control plane.",
      "Analyze is parked.",
    ],
    cta: { href: "/", label: "Open the map" },
  },
];

export function PitchDeck() {
  const [index, setIndex] = useState(0);

  const go = useCallback((delta: number) => {
    setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + delta)));
  }, []);

  const jump = useCallback((next: number) => {
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, next)));
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const n = Number.parseInt(window.location.hash.replace("#", ""), 10);
      if (n >= 1 && n <= SLIDES.length) setIndex(n - 1);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const next = `#${index + 1}`;
    if (window.location.hash !== next) {
      history.replaceState(null, "", `${window.location.pathname}${next}`);
    }
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "Backspace" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        jump(0);
      } else if (event.key === "End") {
        event.preventDefault();
        jump(SLIDES.length - 1);
      } else if (/^[1-5]$/.test(event.key)) {
        jump(Number(event.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, jump]);

  const onStageClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, .pitch-nav")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    go(x < rect.width * 0.28 ? -1 : 1);
  };

  const slide = SLIDES[index];

  return (
    <main className="pitch" onClick={onStageClick}>
      <header className="pitch-top">
        <span className="brand-mark">Eye of Grok</span>
        <span className="pitch-hint">Arrows or click</span>
      </header>

      <section className="pitch-frame" aria-live="polite">
        <p className="kicker">{slide.kicker}</p>
        <h1 className="pitch-title">{slide.title}</h1>
        <ul className="pitch-lines">
          {slide.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {slide.chips && (
          <div className="pitch-chips">
            {slide.chips.map((chip) => (
              <code key={chip} className="pitch-chip">
                {chip}
              </code>
            ))}
          </div>
        )}
        {slide.cta && (
          <Link className="btn pitch-cta" href={slide.cta.href}>
            {slide.cta.label}
          </Link>
        )}
      </section>

      <nav className="pitch-nav" aria-label="Slides">
        <button type="button" className="btn btn-ghost" onClick={() => go(-1)} disabled={index === 0}>
          Prev
        </button>
        <ol className="pitch-dots">
          {SLIDES.map((item, i) => (
            <li key={item.title}>
              <button
                type="button"
                className="pitch-dot"
                data-on={i === index}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => jump(i)}
              />
            </li>
          ))}
        </ol>
        <span className="pitch-count">
          {index + 1} / {SLIDES.length}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => go(1)}
          disabled={index === SLIDES.length - 1}
        >
          Next
        </button>
        <Link className="pitch-map" href="/">
          Map
        </Link>
      </nav>
    </main>
  );
}
