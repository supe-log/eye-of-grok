import { NextResponse } from "next/server";
import { getIngestToken } from "@/lib/auth";
import { requestOrigin } from "@/lib/harness-http";
import { getHarness } from "@/lib/harness-store";
import { botDescription, createSetupPrompt, planToRecipes } from "@/lib/plan-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const state = await getHarness(id);
  if (!state) {
    return NextResponse.json(
      { error: "plan_not_found", orgId: id, hint: "Create one at /start" },
      { status: 404 },
    );
  }
  const { plan } = state;
  const format = new URL(request.url).searchParams.get("format");
  if (format === "recipes") return NextResponse.json(planToRecipes(plan));
  if (format === "prompt") {
    return new Response(
      createSetupPrompt({ origin: requestOrigin(request), plan, token: getIngestToken() }),
      { headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }
  return NextResponse.json({
    ...plan,
    bots: plan.bots.map((bot) => ({ ...bot, description: botDescription(bot, plan) })),
  });
}
