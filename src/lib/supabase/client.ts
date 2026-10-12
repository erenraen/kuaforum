// Tarayıcı (client component) tarafında kullanılan Supabase istemcisi.
"use client";

import { createBrowserClient } from "@supabase/ssr";

// NOT: Gerçek projede `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
// komutuyla üretilen tam tipleri buraya generic olarak verebilirsiniz:
// createBrowserClient<Database>(...). MVP'de tip güvenliğini basitleştirmek için
// generic olmadan bırakıldı.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
