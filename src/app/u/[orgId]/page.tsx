import { notFound } from "next/navigation";
import { OrgMapClient } from "@/components/OrgMapClient";
import { isValidOrgId, normalizeOrgId } from "@/lib/org-id";
import { getOrg, resetOrg } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OrgPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: raw } = await params;
  const orgId = normalizeOrgId(raw);
  if (!isValidOrgId(orgId)) notFound();
  const snapshot = getOrg(orgId) ?? resetOrg(orgId);
  return <OrgMapClient initialSnapshot={snapshot} />;
}
