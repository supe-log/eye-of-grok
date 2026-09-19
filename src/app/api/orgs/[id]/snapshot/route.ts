import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { isLoopbackRequest } from "@/lib/loopback";
import { upsertOrg } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request) && !isLoopbackRequest(request)) return unauthorized();
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const snapshot = await upsertOrg(id, body, "chief_of_staff");
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: "invalid_snapshot",
        detail: error instanceof Error ? error.message : "schema failed",
      },
      { status: 400 },
    );
  }
}
