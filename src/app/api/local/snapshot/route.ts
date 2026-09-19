import { NextResponse } from "next/server";
import {
  CASEY_LOCAL_PROMPT,
  LOCAL_SNAPSHOT_URL,
  createBotSharePrompt,
  publicOrigin,
} from "@/lib/casey-prompt";
import { isLoopbackRequest } from "@/lib/loopback";
import { upsertOrg } from "@/lib/store";
import { DEFAULT_ORG_ID } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({
    url: LOCAL_SNAPSHOT_URL,
    loopback: isLoopbackRequest(request),
    orgId: DEFAULT_ORG_ID,
    prompt: CASEY_LOCAL_PROMPT,
    publicPrompt: createBotSharePrompt({
      origin: publicOrigin(),
      orgId: DEFAULT_ORG_ID,
      ownerName: "Logan May",
    }),
    note: "Grok Bot cloud MCP cannot see localhost. On this Mac, a Bot with local egress POSTs here. For a public URL, use publicPrompt or GET /api/share/mine.",
  });
}

export async function POST(request: Request) {
  if (!isLoopbackRequest(request)) {
    return NextResponse.json(
      {
        error: "loopback_only",
        hint: "This ingest is only for 127.0.0.1 / localhost. Use /api/orgs/mine/snapshot with a bearer token from elsewhere.",
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
    const snapshot = upsertOrg(DEFAULT_ORG_ID, body, "chief_of_staff");
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
