import { NextResponse } from "next/server";
import { getHarness } from "@/lib/harness-store";
import { PROPOSAL_STATUSES, type ProposalStatus } from "@/lib/harness-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const state = await getHarness(id);
  if (!state) return NextResponse.json({ error: "plan_not_found", orgId: id }, { status: 404 });
  const status = new URL(request.url).searchParams.get("status");
  const wanted = PROPOSAL_STATUSES.includes(status as ProposalStatus) ? status : null;
  return NextResponse.json(
    state.proposals.filter((item) => !wanted || item.status === wanted).reverse(),
  );
}
