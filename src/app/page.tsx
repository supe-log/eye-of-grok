import { OrgMapClient } from "@/components/OrgMapClient";
import { getOrg, resetOrg } from "@/lib/store";
import { DEFAULT_ORG_ID } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function Home() {
  const snapshot = getOrg(DEFAULT_ORG_ID) ?? resetOrg(DEFAULT_ORG_ID);
  return <OrgMapClient initialSnapshot={snapshot} />;
}
