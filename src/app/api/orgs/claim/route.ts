import { NextResponse } from "next/server";
import { bearerFromRequest } from "@/lib/auth";
import { isClaimableOrgId, isReservedOrgId, normalizeOrgId } from "@/lib/org-id";
import {
  createBotSharePrompt,
  createBotSpeakLine,
  mapUrl,
  mcpUrl,
  publicOrigin,
  snapshotPostUrl,
} from "@/lib/share-prompt";
import { claimOrg, getStoreInfo, suggestAvailableOrgIds, verifyOrgToken } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { name?: string; orgId?: string; anonymous?: boolean } = {};
  try {
    body = (await request.json()) as { name?: string; orgId?: string; anonymous?: boolean };
  } catch {
    body = {};
  }

  const preferred = normalizeOrgId(body.orgId || body.name || "");
  const result = await claimOrg({
    name: body.name,
    orgId: body.orgId,
    anonymous: body.anonymous,
  });
  const suggestions =
    !result.ok || !result.created
      ? await suggestAvailableOrgIds(preferred || result.orgId)
      : [];

  if (!result.ok) {
    const status = result.error === "reserved_org_id" ? 409 : 400;
    return NextResponse.json(
      {
        error: result.error,
        orgId: result.orgId,
        preferredOrgId: preferred,
        suggestions,
        suggestedOrgId: suggestions[0] ?? null,
        hint:
          result.error === "reserved_org_id"
            ? result.orgId === "mine"
              ? "mine is Logan May's public demo. Open /u/mine, or claim a numbered slug like mine1."
              : "That slug is reserved. Try the next available suggestion."
            : "Type a name that becomes a slug like logan-may.",
      },
      { status },
    );
  }

  const url = new URL(request.url);
  const origin = (url.searchParams.get("origin") || publicOrigin()).replace(/\/$/, "");
  const ownerName =
    body.name?.trim() ||
    result.snapshot.nodes.find((node) => node.kind === "human")?.name ||
    result.orgId;

  const presentedToken = result.created
    ? result.token
    : await matchingBearer(request, result.orgId);

  return NextResponse.json({
    orgId: result.orgId,
    preferredOrgId: preferred,
    created: result.created,
    alreadyClaimed: !result.created,
    yours: Boolean(presentedToken),
    publicRead: true,
    token: presentedToken,
    tokenRevealed: Boolean(presentedToken),
    ownerName,
    origin,
    mapUrl: mapUrl(origin, result.orgId),
    snapshotUrl: snapshotPostUrl(origin, result.orgId),
    mcpUrl: mcpUrl(origin),
    suggestions,
    suggestedOrgId: suggestions[0] ?? null,
    store: getStoreInfo(),
    speak: presentedToken
      ? createBotSpeakLine({ origin, orgId: result.orgId, token: presentedToken })
      : null,
    prompt: presentedToken
      ? createBotSharePrompt({
          origin,
          orgId: result.orgId,
          token: presentedToken,
          ownerName,
        })
      : null,
    hint: presentedToken
      ? undefined
      : `/u/${result.orgId} is already claimed and public to browse. Claim ${suggestions[0] ?? "the next numbered slug"} for your own write token, or paste the existing token to copy that org's prompt.`,
  });
}

async function matchingBearer(request: Request, orgId: string): Promise<string | null> {
  const token = bearerFromRequest(request);
  if (!token) return null;
  return (await verifyOrgToken(orgId, token)) ? token : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("name") || url.searchParams.get("orgId") || "";
  const orgId = normalizeOrgId(raw);
  const suggestions = orgId ? await suggestAvailableOrgIds(orgId) : [];
  return NextResponse.json({
    orgId,
    claimable: isClaimableOrgId(orgId),
    reserved: isReservedOrgId(orgId),
    suggestions,
    hint: "POST { name } to claim a slug and mint that org's ingest token. Maps are public to read.",
  });
}
