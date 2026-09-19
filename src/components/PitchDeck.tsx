"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

type Theme = "anthropic" | "bw";

type Slide = {
  kicker: string;
  title: string;
  lines?: string[];
  // Demo beats are copied from DEMO.md — keep in lockstep.
  steps?: string[];
  chips?: string[];
  cta?: { href: string; label: string };
};

const SLIDES: Slide[] = [
  {
    kicker: "Demo · V1",
    title: "Eye of Grok",
    lines: [
      "The org chart Grok Bot never shipped.",
      "Cursor Austin × AITX.",
      "You write the graph. The site draws it.",
    ],
  },
  {
    kicker: "Problem",
    title: "Scales like a company.",
    lines: ["No org dashboard shipped.", "Hide ≠ pause. No official roster API."],
    chips: ["50 Bots + spaces", "Groups 2–6", "Hide ≠ pause"],
  },
  {
    kicker: "Product",
    title: "Readout, not a control plane.",
    lines: [
      "Humans and CoS write the graph. The site draws it.",
      "Nothing fires a Bot. Analyze is parked.",
    ],
    chips: ["bot | group | human"],
  },
  {
    kicker: "Demo",
    title: "Open. You are Logan.",
    steps: [
      "Open Eye of Grok. You are the only node.",
      "Edit → add Chief of Staff (reports to you), then specialists, then a group space.",
      "Click a node to inspect. Mark one stale or hidden, toggle Flag stale.",
      "Open Mermaid and copy the export if you want it in a chat.",
    ],
  },
  {
    kicker: "Remember",
    title: "Hide ≠ pause.",
    lines: ["Never auto-delete real Bots.", "Analyze is parked."],
    cta: { href: "/", label: "Open the map" },
  },
];

export function PitchDeck() {
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>("anthropic");
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  const go = useCallback((delta: number) => {
    setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + delta)));
  }, []);

  const jump = useCallback((next: number) => {
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, next)));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "anthropic" ? "bw" : "anthropic"));
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
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
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

  useEffect(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    const scale = () => {
      const chrome = 64;
      const factor = Math.min(viewport.clientWidth / 1920, (viewport.clientHeight - chrome) / 1080);
      const x = (viewport.clientWidth - 1920 * factor) / 2;
      const y = (viewport.clientHeight - chrome - 1080 * factor) / 2;
      stage.style.transform = `translate(${x}px, ${y}px) scale(${factor})`;
    };

    scale();
    const observer = new ResizeObserver(scale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const onStageClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    go(x < rect.width * 0.28 ? -1 : 1);
  };

  const slide = SLIDES[index];

  return (
    <main className="pitch" data-theme={theme}>
      <div className="pitch-viewport" ref={viewportRef}>
        <article className="pitch-stage" ref={stageRef} onClick={onStageClick} aria-live="polite">
          <p className="pitch-kicker">{slide.kicker}</p>
          <h1 className="pitch-title" key={slide.title}>
            {slide.title}
          </h1>
          {slide.steps ? (
            <ol className="pitch-steps">
              {slide.steps.map((step, stepIndex) => (
                <li key={step}>
                  <span className="pitch-step-num">{String(stepIndex + 1).padStart(2, "0")}</span>
                  <span className="pitch-step-copy">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <ul className="pitch-lines">
              {(slide.lines ?? []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
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
            <Link className="pitch-cta" href={slide.cta.href}>
              {slide.cta.label}
            </Link>
          )}
          <footer className="pitch-footer">
            <span>Eye of Grok</span>
            <span>
              {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
            </span>
          </footer>
        </article>
      </div>

      <nav className="pitch-nav" aria-label="Slides">
        <button type="button" className="pitch-btn" onClick={() => go(-1)} disabled={index === 0}>
          Prev
        </button>
        <ol className="pitch-dots">
          {SLIDES.map((item, i) => (
            <li key={item.kicker + item.title}>
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
        <button type="button" className="pitch-btn" onClick={() => go(1)} disabled={index === SLIDES.length - 1}>
          Next
        </button>
        <button
          type="button"
          className="pitch-theme"
          onClick={toggleTheme}
          aria-label="Toggle deck theme"
          title="Anthropic cream/terracotta, or black and white"
        >
          {theme === "anthropic" ? "Anthropic" : "Black and white"}
        </button>
        <Link className="pitch-map" href="/">
          Map
        </Link>
      </nav>
    </main>
  );
}
