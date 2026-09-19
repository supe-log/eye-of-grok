"use client";

import dynamic from "next/dynamic";
import type { OrgSnapshot } from "@/lib/types";

const OrgWorkbench = dynamic(
  () => import("@/components/OrgWorkbench").then((mod) => mod.OrgWorkbench),
  {
    ssr: false,
    loading: () => (
      <main className="shell">
        <p className="muted">Opening the roster…</p>
      </main>
    ),
  },
);

export function OrgMapClient({
  initialSnapshot,
}: {
  initialSnapshot: OrgSnapshot;
}) {
  return <OrgWorkbench initialSnapshot={initialSnapshot} />;
}
