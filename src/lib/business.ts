import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Giriş yapmış kullanıcının yönettiği işletmeyi getirir. MVP'de bir kullanıcı
// tek işletme yönetir varsayımıyla ilk üyeliği döner (çoklu şube ileride eklenir).
export async function getCurrentBusiness() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris");

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role, businesses(*)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return { user, business: null as any, role: null };

  // Trial süresi dolmuşsa 'expired' durumuna geçir (gerçek bir cron job bu
  // projede yok; idempotent olduğu için her panel yüklemesinde güvenle
  // çağrılabilir — bkz. supabase/07_hardening.sql).
  let business = membership.businesses as any;
  if (business?.subscription_status === "trial" && business.trial_ends_at && new Date(business.trial_ends_at) < new Date()) {
    const { data: newStatus } = await supabase.rpc("expire_trial_if_needed", { p_business_id: business.id });
    if (newStatus) business = { ...business, subscription_status: newStatus };
  }

  return { user, business, role: membership.role as string };
}
