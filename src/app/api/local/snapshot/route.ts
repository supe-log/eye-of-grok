import { NextResponse } from "next/server";
import {
  CASEY_LOCAL_PROMPT,
  LOCAL_SNAPSHOT_URL,
  createBotSharePrompt,
  publicOrigin,
} from "@/lib/casey-prompt";
import { isLoopbackRequest } from "@/lib/loopback";
import { ensureMineOrg, getStoreInfo, upsertOrg } from "@/lib/store";
import { getMineIngestToken } from "@/lib/tokens";
import { DEFAULT_ORG_ID } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const mineToken = getMineIngestToken();
  return NextResponse.json({
    url: LOCAL_SNAPSHOT_URL,
    loopback: isLoopbackRequest(request),
    orgId: DEFAULT_ORG_ID,
    store: getStoreInfo(),
    prompt: CASEY_LOCAL_PROMPT,
    publicPrompt: mineToken
      ? createBotSharePrompt({
          origin: publicOrigin(),
          orgId: DEFAULT_ORG_ID,
          token: mineToken,
          ownerName: "Logan May",
        })
      : null,
    note: "Grok Bot cloud MCP cannot see localhost. On this Mac, a Bot with local egress POSTs here with no bearer. Other people should claim a slug on the home page and use that org's token — not this loopback door.",
  });
}

export async function POST(request: Request) {
  if (!isLoopbackRequest(request)) {
    return NextResponse.json(
      {
        error: "loopback_only",
        hint: "This ingest is only for 127.0.0.1 / localhost. Claim a slug and POST /api/orgs/<slug>/snapshot with that org's bearer from elsewhere.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await ensureMineOrg();
    const snapshot = await upsertOrg(DEFAULT_ORG_ID, body, "chief_of_staff");
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
