"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "@/lib/theme";

export function MermaidView({ source }: { source: string }) {
  const reactId = useId().replace(/:/g, "");
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        const css = getComputedStyle(document.documentElement);
        const token = (name: string) => css.getPropertyValue(name).trim();
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          securityLevel: "loose",
          fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui",
          themeVariables: {
            background: token("--canvas"),
            primaryColor: token("--card"),
            primaryTextColor: token("--ink"),
            primaryBorderColor: token("--line-2"),
            secondaryColor: token("--panel"),
            tertiaryColor: token("--panel"),
            lineColor: token("--line-2"),
            textColor: token("--ink-2"),
            mainBkg: token("--card"),
            nodeBorder: token("--line-2"),
            clusterBkg: token("--card-group"),
            clusterBorder: token("--line"),
            edgeLabelBackground: token("--card"),
            fontSize: "12px",
          },
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
  }, [source, reactId, theme]);

  if (error) {
    return <p className="panel-error">{error}</p>;
  }
  if (!svg) {
    return <p className="muted">Rendering diagram…</p>;
  }
  return <div className="mermaid-frame" dangerouslySetInnerHTML={{ __html: svg }} />;
}
