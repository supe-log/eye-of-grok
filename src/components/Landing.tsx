"use client";

import Link from "next/link";
import { Logo } from "./Logo";

export function Landing() {
  return (
    <main className="landing">
      <div className="landing-nav">
        <Logo href="/" />
        <div className="landing-nav-links">
          <Link href="/u/mine" className="landing-nav-link">Live demo</Link>
          <Link href="/claim" className="btn btn-ghost landing-nav-cta">Claim map</Link>
        </div>
      </div>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-visual" aria-hidden>
          <div className="landing-hero-image" />
          <div className="landing-hero-overlay" />
        </div>
        <div className="landing-hero-body">
          <p className="kicker">Mission control for your AI fleet</p>
          <h1 id="hero-title" className="landing-headline">
            See your fleet<br />before you fly.
          </h1>
          <p className="landing-sub">
            One paste from your Chief of Staff draws every Grok Bot,
            group space, and handoff in your account — live, shareable, judgment-ready.
          </p>
          <div className="landing-cta-row">
            <Link href="/claim" className="btn">Claim your map</Link>
            <Link href="/u/mine" className="btn btn-ghost">See a live example</Link>
          </div>
          <div className="landing-telemetry" aria-hidden>
            <span className="landing-tick"><span className="landing-tick-dot" />LIVE</span>
            <span className="landing-tick">V1 · 2026</span>
            <span className="landing-tick">SHAREABLE</span>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="what-title">
        <p className="kicker">What it draws</p>
        <h2 id="what-title" className="landing-section-title">
          Every corner of your Grok account, in one map.
        </h2>
        <div className="landing-grid">
          <article className="landing-tile">
            <span className="landing-tile-num">01</span>
            <h3>Bots</h3>
            <p>Every assistant with its title, tools, and status — active, stale, hidden, deprecated, duplicate.</p>
          </article>
          <article className="landing-tile">
            <span className="landing-tile-num">02</span>
            <h3>Spaces</h3>
            <p>Group chats and sidebar sections, plus their membership — who&apos;s in each space and who&apos;s over-cap.</p>
          </article>
          <article className="landing-tile">
            <span className="landing-tile-num">03</span>
            <h3>Handoffs</h3>
            <p>Who reports to whom, which Bot escalates where. The edges no chat log will show you.</p>
          </article>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="how-title">
        <p className="kicker">How it works</p>
        <h2 id="how-title" className="landing-section-title">
          Three steps. No API keys. No logins.
        </h2>
        <ol className="landing-steps">
          <li>
            <span className="landing-step-num">T-00</span>
            <div>
              <h3>Claim a slug</h3>
              <p>Type your name. We generate a private map URL — <code>/u/your-name</code>.</p>
            </div>
          </li>
          <li>
            <span className="landing-step-num">T-01</span>
            <div>
              <h3>Paste one message</h3>
              <p>Copy the Chief of Staff prompt. Drop it into your CoS on phone or desktop.</p>
            </div>
          </li>
          <li>
            <span className="landing-step-num">T-02</span>
            <div>
              <h3>Watch it draw</h3>
              <p>Your roster POSTs itself. The map updates in ~2 seconds. Share the URL with anyone.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="landing-final" aria-labelledby="final-title">
        <h2 id="final-title" className="landing-final-title">Ready for launch?</h2>
        <p className="landing-final-sub">Twenty seconds. One paste. The map is the product.</p>
        <div className="landing-cta-row">
          <Link href="/claim" className="btn">Claim your map</Link>
          <Link href="/u/mine" className="btn btn-ghost">Live demo first</Link>
        </div>
      </section>

      <footer className="landing-foot">
        <span>Eye of Grok · v1</span>
        <span>Built for Grok Bot orgs · Hackathon 2026</span>
      </footer>
    </main>
  );
}
