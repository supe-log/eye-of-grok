import { NextResponse } from "next/server";
import { analyzeOrg } from "@/lib/analyze-org";
import { getOrg } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const org = getOrg(id);
  if (!org) {
    return NextResponse.json({ error: "org_not_found", orgId: id }, { status: 404 });
  }
  const result = await analyzeOrg(org);
  return NextResponse.json(result);
}
