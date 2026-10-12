import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/utils";

export default async function WaitlistPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: entries } = await supabase
    .from("waitlist_entries")
    .select("*, customers(full_name, phone), services(name), employees(full_name)")
    .eq("business_id", business.id)
    .gte("desired_date", todayIso())
    .order("desired_date");

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Bekleme Listesi</h1>
      <p className="mt-1 max-w-lg text-sm text-stone-500">
        Dolu bir saat için bekleme listesine katılan müşteriler burada listelenir. Şu an otomatik
        SMS/bildirim yok — uygun bir saat boşaldığında müşteriyi elle arayabilirsiniz.
      </p>

      <div className="mt-5 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
        {(entries ?? []).map((w: any) => (
          <div key={w.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
            <div>
              <p className="font-medium text-ink">{w.customers?.full_name} · {w.customers?.phone}</p>
              <p className="text-stone-500">
                {w.services?.name} · {w.employees?.full_name} ·{" "}
                {new Date(w.desired_date).toLocaleDateString("tr-TR")}
              </p>
            </div>
            {w.is_notified && (
              <span className="rounded-full bg-moss-50 px-2.5 py-1 text-xs text-moss-700">Bilgilendirildi</span>
            )}
          </div>
        ))}
        {(entries ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-stone-500">Şu an bekleme listesinde kimse yok.</p>
        )}
      </div>
    </div>
  );
}
