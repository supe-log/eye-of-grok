import Link from "next/link";
import type { OrgGalleryCard } from "@/lib/gallery";
import { relativeTime } from "@/lib/status-style";

export function PublicGallery({ orgs }: { orgs: OrgGalleryCard[] }) {
  if (orgs.length === 0) {
    return <p className="muted">No maps yet. Claim a slug above to publish the first layout.</p>;
  }

  return (
    <ul className="gallery-grid">
      {orgs.map((org) => (
        <li key={org.orgId}>
          <Link className="gallery-card" href={`/u/${org.orgId}`}>
            <span className="gallery-card-copy">
              <strong>{org.label}</strong>
              <code>/u/{org.orgId}</code>
            </span>
            <span className="gallery-card-meta">
              {org.demo ? "Logan demo · " : org.anonymous ? "Anonymous · " : ""}
              {org.bots} bots · {org.groups} rooms · {relativeTime(org.pushedAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
