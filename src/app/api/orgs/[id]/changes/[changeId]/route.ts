import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorized } from "@/lib/auth";
import { canWrite, harnessError, readJson } from "@/lib/harness-http";
import { decideProposal } from "@/lib/harness-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const decisionSchema = z.object({ decision: z.enum(["approved", "rejected"]) });

/** Owner approves or rejects a proposed change. Approval updates the plan. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; changeId: string }> },
) {
  if (!canWrite(request)) return unauthorized();
  const { id, changeId } = await context.params;
  const parsed = decisionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }
  try {
    const state = await decideProposal(id, changeId, parsed.data.decision);
    return NextResponse.json({ version: state.plan.version, proposals: state.proposals });
  } catch (error) {
    return harnessError(error);
  }
}
