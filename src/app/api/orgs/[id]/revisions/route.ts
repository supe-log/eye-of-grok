import { NextResponse } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth";
import { isLoopbackRequest } from "@/lib/loopback";
import { listOrgRevisions, restoreOrgRevision } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const revisions = await listOrgRevisions(id);
  return NextResponse.json({ orgId: id, revisions });
}

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
  const revisionId =
    typeof body === "object" && body !== null && "revisionId" in body
      ? Number((body as { revisionId: unknown }).revisionId)
      : Number.NaN;
  if (!Number.isFinite(revisionId) || revisionId <= 0) {
    return NextResponse.json({ error: "invalid_revision" }, { status: 400 });
  }
  try {
    const snapshot = await restoreOrgRevision(id, revisionId);
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error: "restore_failed",
        detail: error instanceof Error ? error.message : "restore failed",
      },
      { status: 400 },
    );
  }
}
