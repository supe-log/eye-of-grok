"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

const PRESENTER = "Logan May";
const GITHUB = "github.com/supe-log/eye-of-grok";

type Slide =
  | {
      kind: "title";
      kicker: string;
      title: string;
      promise: string;
      lines: string[];
    }
  | {
      kind: "bullets";
      kicker: string;
      title: string;
      bullets: string[];
      note?: string;
      chips?: string[];
    }
  | {
      kind: "demo";
      kicker: string;
      title: string;
      // Copied from DEMO.md — keep in lockstep.
      steps: string[];
    }
  | {
      kind: "close";
      kicker: string;
      title: string;
      bullets: string[];
      cta: { href: string; label: string };
    };

const SLIDES: Slide[] = [
  {
    kind: "title",
    kicker: "Demo · V1",
    title: "Eye of Grok",
    promise: "The org chart Grok Bot never shipped.",
    lines: ["Cursor Austin × AITX.", "You write the graph. The site draws it."],
  },
  {
    kind: "bullets",
    kicker: "Problem",
    title: "Grok Bot scales like a company.",
    bullets: [
      "No dashboard.",
      "Cap is 50 Bots + spaces. Groups are 2–6.",
      "Hide ≠ pause. No official roster API.",
      "CoS sees the mess. Humans cannot.",
    ],
  },
  {
    kind: "bullets",
    kicker: "Product",
    title: "Readout, not a second control plane.",
    bullets: [
      "Edit names from the sidebar.",
      "Kinds stay bot, group, and human.",
      "Edges are reports_to, member_of, handoff, and shares_context.",
      "Mermaid export. CoS can POST or MCP later.",
    ],
    chips: ["bot | group | human", "reports_to | member_of | handoff | shares_context"],
    note: "Nothing fires a Bot. Analyze is parked.",
  },
  {
    kind: "demo",
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
    kind: "close",
    kicker: "Remember",
    title: "Hide ≠ pause.",
    bullets: ["Never auto-delete real Bots.", "Readout, not a control plane.", "Analyze is parked."],
    cta: { href: "/", label: "Open the map" },
  },
];

function OrgMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="36" fill="#141413" />
      <circle cx="36" cy="22" r="5.5" fill="#d97757" />
      <circle cx="22" cy="48" r="5" fill="#faf9f5" />
      <circle cx="50" cy="48" r="5" fill="#faf9f5" />
      <path d="M36 28v10M36 38L22 48M36 38l14 10" fill="none" stroke="#d97757" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function BulletMark() {
  return (
    <svg className="pitch-bullet-mark" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="18" cy="18" r="5" fill="currentColor" />
    </svg>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  if (slide.kind === "title") {
    return (
      <>
        <OrgMark className="pitch-mark" />
        <h1 className="pitch-title">{slide.title}</h1>
        <hr className="pitch-rule" />
        <p className="pitch-promise">{slide.promise}</p>
        <ul className="pitch-sublines">
          {slide.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </>
    );
  }

  if (slide.kind === "demo") {
    return (
      <>
        <OrgMark className="pitch-mark-sm" />
        <h1 className="pitch-title">{slide.title}</h1>
        <ol className="pitch-steps">
          {slide.steps.map((step, stepIndex) => (
            <li key={step}>
              <span className="pitch-step-num">{String(stepIndex + 1).padStart(2, "0")}</span>
              <span className="pitch-step-copy">{step}</span>
            </li>
          ))}
        </ol>
      </>
    );
  }

  if (slide.kind === "close") {
    return (
      <>
        <OrgMark className="pitch-mark-sm" />
        <h1 className="pitch-title">{slide.title}</h1>
        <hr className="pitch-rule" />
        <ul className="pitch-bullets">
          {slide.bullets.map((bullet) => (
            <li key={bullet}>
              <BulletMark />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <Link className="pitch-cta" href={slide.cta.href}>
          {slide.cta.label}
        </Link>
      </>
    );
  }

  return (
    <>
      <OrgMark className="pitch-mark-sm" />
      <h1 className="pitch-title">{slide.title}</h1>
      <ul className="pitch-bullets">
        {slide.bullets.map((bullet) => (
          <li key={bullet}>
            <BulletMark />
            <span>{bullet}</span>
          </li>
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
      {slide.note ? <p className="pitch-note">{slide.note}</p> : null}
    </>
  );
}

export function PitchDeck() {
  const [index, setIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);

  const go = useCallback((delta: number) => {
    setIndex((current) => Math.min(SLIDES.length - 1, Math.max(0, current + delta)));
  }, []);

  const jump = useCallback((next: number) => {
    setIndex(Math.min(SLIDES.length - 1, Math.max(0, next)));
  }, []);

  const skipFirstHashWrite = useRef(true);

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
    // Skip the mount write so `#4` is not replaced with `#1` before applyHash lands.
    if (skipFirstHashWrite.current) {
      skipFirstHashWrite.current = false;
      return;
    }
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
      const chrome = 56;
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
  const showGithub = slide.kind === "title" || slide.kind === "close";

  const footerRight: ReactNode = showGithub ? GITHUB : "\u00a0";

  return (
    <main className="pitch">
      <div className="pitch-viewport" ref={viewportRef}>
        <article
          className="pitch-stage"
          ref={stageRef}
          data-kind={slide.kind}
          data-slide={index + 1}
          onClick={onStageClick}
          aria-live="polite"
        >
          <p className="pitch-kicker">{slide.kicker}</p>
          <SlideBody slide={slide} />
          <footer className="pitch-footer">
            <span>{PRESENTER}</span>
            <span>{footerRight}</span>
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
        <Link className="pitch-map" href="/">
          Map
        </Link>
      </nav>
    </main>
  );
}
