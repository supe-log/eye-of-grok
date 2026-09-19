import { NextResponse } from "next/server";
import { snapshotToMermaid } from "@/lib/mermaid";
import { getOrg } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json({ error: "org_not_found", orgId: id }, { status: 404 });
  }
  const mermaid = snapshotToMermaid(org);
  return NextResponse.json({ orgId: org.orgId, pushedAt: org.pushedAt, mermaid });
}
