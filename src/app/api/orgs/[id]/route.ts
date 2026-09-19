import { NextResponse } from "next/server";
import { getOrg, resetOrg } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  if (url.searchParams.get("reset") === "1") {
    return NextResponse.json(await resetOrg(id));
  }
  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json({ error: "org_not_found", orgId: id }, { status: 404 });
  }
  return NextResponse.json(org);
}
