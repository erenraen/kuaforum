import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { HoursEditor } from "@/components/business/HoursEditor";

export default async function BusinessHoursPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("business_id", business.id);

  return <HoursEditor initialHours={hours ?? []} />;
}
