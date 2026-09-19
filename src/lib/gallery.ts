import { displayNameFromOrgId } from "./org-id";
import type { OrgRecord } from "./org-record";
import { DEFAULT_ORG_ID } from "./types";

export type OrgGalleryCard = {
  orgId: string;
  label: string;
  anonymous: boolean;
  demo: boolean;
  pushedAt: string;
  claimedAt: string;
  bots: number;
  groups: number;
};

export function galleryCardFromRecord(record: OrgRecord): OrgGalleryCard {
  const anonymous = record.anonymous === true;
  return {
    orgId: record.orgId,
    label: anonymous
      ? "Anonymous layout"
      : record.ownerName?.trim() || displayNameFromOrgId(record.orgId),
    anonymous,
    demo: record.orgId === DEFAULT_ORG_ID,
    pushedAt: record.snapshot.pushedAt,
    claimedAt: record.claimedAt,
    bots: record.snapshot.nodes.filter((node) => node.kind === "bot").length,
    groups: record.snapshot.nodes.filter((node) => node.kind === "group").length,
  };
}
