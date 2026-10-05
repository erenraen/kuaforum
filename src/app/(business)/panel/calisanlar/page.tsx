import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { EmployeeManager } from "@/components/business/EmployeeManager";

export default async function EmployeesPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const [{ data: employees }, { data: services }] = await Promise.all([
    supabase
      .from("employees")
      .select("*, employee_services(service_id)")
      .eq("business_id", business.id)
      .order("sort_order"),
    supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true),
  ]);

  return <EmployeeManager businessId={business.id} initialEmployees={(employees as any) ?? []} services={services ?? []} />;
}
