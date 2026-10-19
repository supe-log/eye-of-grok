import { NextResponse } from "next/server";
import { z } from "zod";
import { getIngestToken, unauthorized } from "@/lib/auth";
import { canWrite, harnessError, readJson, requestOrigin } from "@/lib/harness-http";
import { createHarness, getHarness } from "@/lib/harness-store";
import { intakeSchema } from "@/lib/harness-types";
import { isValidOrgId, normalizeOrgId } from "@/lib/org-id";
import { createSetupPrompt, planUrl, teamUrl } from "@/lib/plan-export";
import { mapUrl } from "@/lib/share-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startSchema = z.object({
  orgId: z.string().optional(),
  intake: intakeSchema,
});

export async function POST(request: Request) {
  const parsed = startSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_intake", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { intake } = parsed.data;
  const orgId = normalizeOrgId(parsed.data.orgId ?? intake.businessName);
  if (!isValidOrgId(orgId)) {
    return NextResponse.json({ error: "invalid_org_id", orgId }, { status: 400 });
  }
  if ((await getHarness(orgId)) && !canWrite(request)) return unauthorized();

  try {
    const { plan } = await createHarness(orgId, intake);
    const origin = requestOrigin(request);
    return NextResponse.json({
      orgId,
      version: plan.version,
      bots: plan.bots.length,
      groups: plan.groups.length,
      teamUrl: teamUrl(origin, orgId),
      mapUrl: mapUrl(origin, orgId),
      planUrl: planUrl(origin, orgId),
      setupPrompt: createSetupPrompt({ origin, plan, token: getIngestToken() }),
    });
  } catch (error) {
    return harnessError(error);
  }
}
