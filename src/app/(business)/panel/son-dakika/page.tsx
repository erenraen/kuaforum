import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { LastMinuteManager } from "@/components/business/LastMinuteManager";

export default async function LastMinutePage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const [{ data: employees }, { data: services }, { data: slots }] = await Promise.all([
    supabase.from("employees").select("*").eq("business_id", business.id).eq("is_active", true),
    supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true),
    supabase
      .from("last_minute_slots")
      .select("*, services(name)")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("starts_at"),
  ]);

  return (
    <LastMinuteManager
      employees={employees ?? []}
      services={services ?? []}
      initialSlots={slots ?? []}
    />
  );
}
