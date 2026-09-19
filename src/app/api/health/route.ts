import { NextResponse } from "next/server";
import { getOrgRecord, getStoreInfo } from "@/lib/store";
import { DEFAULT_ORG_ID } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStoreInfo();
  const mine = await getOrgRecord(DEFAULT_ORG_ID);
  return NextResponse.json({
    ok: true,
    store,
    mineSeeded: Boolean(mine),
    hint:
      store.driver === "neon"
        ? "Neon is configured; org records and revisions survive cold serverless instances."
        : store.driver === "vercel-blob"
          ? "Vercel Blob is configured as a secondary store. Prefer DATABASE_URL / Neon in production."
          : "Filesystem store. Local/Mac is fine. On Vercel, set DATABASE_URL so snapshots do not vanish.",
  });
}
