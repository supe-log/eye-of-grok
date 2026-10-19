import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/auth";
import { canWrite, harnessError } from "@/lib/harness-http";
import { markApplied } from "@/lib/harness-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Chief of Staff confirms an approved change is live in Grok Bot. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; changeId: string }> },
) {
  if (!canWrite(request)) return unauthorized();
  const { id, changeId } = await context.params;
  try {
    return NextResponse.json(await markApplied(id, changeId));
  } catch (error) {
    return harnessError(error);
  }
}
