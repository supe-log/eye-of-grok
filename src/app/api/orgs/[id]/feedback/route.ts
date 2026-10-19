import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/auth";
import { canWrite, harnessError, readJson } from "@/lib/harness-http";
import { addFeedback, getHarness } from "@/lib/harness-store";
import { feedbackInputSchema } from "@/lib/harness-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const state = await getHarness(id);
  if (!state) return NextResponse.json({ error: "plan_not_found", orgId: id }, { status: 404 });
  return NextResponse.json(state.feedback.slice(-100).reverse());
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!canWrite(request)) return unauthorized();
  const { id } = await context.params;
  const parsed = feedbackInputSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_feedback", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await addFeedback(id, parsed.data));
  } catch (error) {
    return harnessError(error);
  }
}
