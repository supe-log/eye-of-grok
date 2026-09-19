import { NextResponse } from "next/server";
import { isAuthorizedForOrg, unauthorized } from "@/lib/auth";
import { upsertOrg } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!(await isAuthorizedForOrg(request, id))) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const snapshot = await upsertOrg(id, body, "chief_of_staff");
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "schema failed";
    const status = message === "org_not_claimed" ? 404 : 400;
    return NextResponse.json(
      {
        error: message === "org_not_claimed" ? "org_not_claimed" : "invalid_snapshot",
        detail: message,
        hint:
          message === "org_not_claimed"
            ? "Claim this slug on the home page first so a write token exists."
            : undefined,
      },
      { status },
    );
  }
}
