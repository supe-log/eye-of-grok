import Link from "next/link";

export function UnclaimedOrg({ orgId }: { orgId: string }) {
  return (
    <main className="share-shell">
      <header className="share-brand">
        <Link className="brand-mark" href="/" style={{ color: "inherit", textDecoration: "none" }}>
          Eye of Grok
        </Link>
        <span className="brand-sub">Unclaimed map</span>
      </header>
      <section className="share-card">
        <p className="kicker">/u/{orgId}</p>
        <h1>This slug is not claimed yet.</h1>
        <p className="body">
          Claim it from the home page (or take logan1 if the name is taken), then
          paste the Chief of Staff message into that account&apos;s Bot. Maps are
          public once claimed. Visiting a URL does not create one.
        </p>
        <div className="chip-row">
          <Link className="btn" href="/">
            Claim this slug
          </Link>
          <Link className="btn btn-ghost" href="/u/mine">
            Logan May demo
          </Link>
        </div>
      </section>
    </main>
  );
}
