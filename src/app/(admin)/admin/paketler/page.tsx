import { createClient } from "@/lib/supabase/server";
import { PlanManager } from "@/components/admin/PlanManager";

export default async function PlansAdminPage() {
  const supabase = createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("sort_order");
  return <PlanManager initialPlans={plans ?? []} />;
}
