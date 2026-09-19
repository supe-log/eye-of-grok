import { ShareHome } from "@/components/ShareHome";
import { listGallery } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialGallery = await listGallery();
  return <ShareHome initialGallery={initialGallery} />;
}
