import { NextResponse } from "next/server";
import { bearerFromRequest, isAuthorizedForOrg, unauthorized } from "@/lib/auth";
import { isLoopbackRequest } from "@/lib/loopback";
import {
  createBotSharePrompt,
  createBotSpeakLine,
  mapUrl,
  mcpUrl,
  publicOrigin,
  snapshotPostUrl,
} from "@/lib/share-prompt";
import { rotateOrgToken } from "@/lib/store";
import { DEFAULT_ORG_ID } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (id === DEFAULT_ORG_ID) {
    return NextResponse.json(
      {
        error: "mine_uses_env_token",
        hint: "Logan's /u/mine write secret is INGEST_TOKEN. Change that env var to rotate.",
      },
      { status: 400 },
    );
  }
  if (!(await isAuthorizedForOrg(request, id))) return unauthorized();
  if (isLoopbackRequest(request) && !bearerFromRequest(request)) {
    return unauthorized("Rotation needs the current bearer even on loopback.");
  }

  try {
    const token = await rotateOrgToken(id);
    const origin = publicOrigin();
    return NextResponse.json({
      orgId: id,
      token,
      tokenRevealed: true,
      mapUrl: mapUrl(origin, id),
      snapshotUrl: snapshotPostUrl(origin, id),
      mcpUrl: mcpUrl(origin),
      speak: createBotSpeakLine({ origin, orgId: id, token }),
      prompt: createBotSharePrompt({ origin, orgId: id, token }),
      hint: "Save this token. The previous bearer no longer writes.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "rotate_failed";
    const status = message === "org_not_claimed" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
