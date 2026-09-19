import { NextResponse } from "next/server";
import { isAuthorizedForOrg, unauthorized } from "@/lib/auth";
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
    if (!(await isAuthorizedForOrg(request, id))) return unauthorized();
    try {
      return NextResponse.json(await resetOrg(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "reset_failed";
      const status = message === "org_not_claimed" ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }
  const org = await getOrg(id);
  if (!org) {
    return NextResponse.json({ error: "org_not_found", orgId: id }, { status: 404 });
  }
  return NextResponse.json(org);
}
