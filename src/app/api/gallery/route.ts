import { NextResponse } from "next/server";
import { listGallery } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orgs = await listGallery();
  return NextResponse.json({
    publicRead: true,
    count: orgs.length,
    orgs,
    hint: "Maps are public. Write tokens are not listed here — those stay in each owner's CoS prompt.",
  });
}
