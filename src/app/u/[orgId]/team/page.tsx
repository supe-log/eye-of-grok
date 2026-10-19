import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { TeamConsole } from "@/components/TeamConsole";
import { getIngestToken } from "@/lib/auth";
import { getHarness } from "@/lib/harness-store";
import { isValidOrgId, normalizeOrgId } from "@/lib/org-id";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: raw } = await params;
  const orgId = normalizeOrgId(raw);
  if (!isValidOrgId(orgId)) notFound();
  const state = await getHarness(orgId);
  if (!state) redirect(`/start?org=${orgId}`);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return (
    <TeamConsole
      initialState={{ ...state, feedback: state.feedback.slice(-50) }}
      origin={`${proto}://${host}`}
      token={getIngestToken()}
    />
  );
}
