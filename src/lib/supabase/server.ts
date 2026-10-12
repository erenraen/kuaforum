// Server component / server action tarafında kullanılan Supabase istemcisi.
// Kullanıcının oturum çerezlerini okuyup RLS'in doğru kullanıcı olarak
// çalışmasını sağlar.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server component içinden çağrıldığında (middleware olmadan)
            // cookie set edilemeyebilir; middleware bunu yönetir.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // bkz. yukarıdaki not
          }
        },
      },
    }
  );
}
