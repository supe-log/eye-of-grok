import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/auth";
import { canWrite, harnessError } from "@/lib/harness-http";
import { runRetro } from "@/lib/harness-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Turn feedback since the last retro into proposals for the owner to approve. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!canWrite(request)) return unauthorized();
  const { id } = await context.params;
  try {
    const proposals = await runRetro(id);
    return NextResponse.json({ created: proposals.length, proposals });
  } catch (error) {
    return harnessError(error);
  }
}
