"use client";

import { useEffect, useId, useState } from "react";

export function MermaidView({ source }: { source: string }) {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
        });
        const id = `orgmmd-${reactId}-${Math.random().toString(36).slice(2, 8)}`;
        const { svg: next } = await mermaid.render(id, source);
        if (!cancelled) {
          setSvg(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Mermaid failed");
        }
      }
    }
    if (source.trim()) void render();
    return () => {
      cancelled = true;
    };
  }, [source, reactId]);

  if (error) {
    return <p className="panel-error">{error}</p>;
  }
  if (!svg) {
    return <p className="muted">Rendering diagram…</p>;
  }
  return <div className="mermaid-frame" dangerouslySetInnerHTML={{ __html: svg }} />;
}
