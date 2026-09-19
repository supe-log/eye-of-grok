import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/auth";
import { isValidOrgId, normalizeOrgId } from "@/lib/org-id";
import {
  createBotSharePrompt,
  createBotSpeakLine,
  mapUrl,
  mcpUrl,
  publicOrigin,
  snapshotPostUrl,
} from "@/lib/share-prompt";
import { getOrgRecord, getStoreInfo, verifyOrgToken } from "@/lib/store";
import { getMineIngestToken } from "@/lib/tokens";
import { DEFAULT_ORG_ID } from "@/lib/types";

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

  const record = await getOrgRecord(orgId);
  if (!record && orgId !== DEFAULT_ORG_ID) {
    return NextResponse.json({ error: "org_not_claimed", orgId }, { status: 404 });
  }

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") || publicOrigin()).replace(/\/$/, "");
  const presented = await revealableToken(request, orgId);

  return NextResponse.json({
    orgId,
    claimed: Boolean(record) || orgId === DEFAULT_ORG_ID,
    origin,
    mapUrl: mapUrl(origin, orgId),
    snapshotUrl: snapshotPostUrl(origin, orgId),
    mcpUrl: mcpUrl(origin),
    store: getStoreInfo(),
    token: presented,
    tokenRevealed: Boolean(presented),
    speak: presented ? createBotSpeakLine({ origin, orgId, token: presented }) : null,
    prompt: presented
      ? createBotSharePrompt({
          origin,
          orgId,
          token: presented,
          ownerName: record?.ownerName,
        })
      : null,
    hint: presented
      ? undefined
      : "Write token is not returned on a public GET. Send the org bearer to reveal the CoS prompt, or claim the slug on the home page.",
  });
}

async function revealableToken(request: Request, orgId: string): Promise<string | null> {
  const token = bearerFromRequest(request);
  if (token && (await verifyOrgToken(orgId, token))) return token;
  if (orgId === DEFAULT_ORG_ID) {
    const mine = getMineIngestToken();
    if (mine && token && (await verifyOrgToken(orgId, token))) return mine;
  }
  return null;
}
