// SADECE server-side kullanılmalıdır (route handler / server action içinde).
// service_role anahtarı RLS'i bypass eder — admin işlemleri (işletme onaylama,
// istatistik toplama) için kullanılır. İstemciye (browser) ASLA gönderilmemelidir.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
