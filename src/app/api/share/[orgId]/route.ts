import { NextResponse } from "next/server";
import { getIngestToken } from "@/lib/auth";
import { isValidOrgId, normalizeOrgId } from "@/lib/org-id";
import {
  createBotSharePrompt,
  createBotSpeakLine,
  mapUrl,
  mcpUrl,
  publicOrigin,
  snapshotPostUrl,
} from "@/lib/share-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  const { orgId: raw } = await context.params;
  const orgId = normalizeOrgId(raw);
  if (!isValidOrgId(orgId)) {
    return NextResponse.json({ error: "invalid_org_id" }, { status: 400 });
  }

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") || publicOrigin()).replace(/\/$/, "");
  const token = getIngestToken();

  return NextResponse.json({
    orgId,
    origin,
    mapUrl: mapUrl(origin, orgId),
    snapshotUrl: snapshotPostUrl(origin, orgId),
    mcpUrl: mcpUrl(origin),
    token,
    speak: createBotSpeakLine({ origin, orgId, token }),
    prompt: createBotSharePrompt({ origin, orgId, token }),
  });
}
