import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { GalleryManager } from "@/components/business/GalleryManager";

export default async function GalleryPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: photos } = await supabase
    .from("business_photos")
    .select("id, url")
    .eq("business_id", business.id)
    .order("sort_order");

  return <GalleryManager businessId={business.id} initialPhotos={photos ?? []} />;
}
