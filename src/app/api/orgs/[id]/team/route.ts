import { NextResponse } from "next/server";
import { getHarness } from "@/lib/harness-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the team console shows: plan, recent feedback, proposals. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const state = await getHarness(id);
  if (!state) return NextResponse.json({ error: "plan_not_found", orgId: id }, { status: 404 });
  return NextResponse.json({ ...state, feedback: state.feedback.slice(-50) });
}
