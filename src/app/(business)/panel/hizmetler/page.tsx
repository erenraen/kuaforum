import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { ServiceManager } from "@/components/business/ServiceManager";

export default async function ServicesPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("business_id", business.id)
    .order("sort_order");

  return <ServiceManager initialServices={services ?? []} />;
}
