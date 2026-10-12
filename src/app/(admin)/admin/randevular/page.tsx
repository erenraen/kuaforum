import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatTime } from "@/lib/utils";

export default async function AdminAppointmentsPage() {
  const supabase = createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, businesses(name, slug), services(name), customers(full_name, phone)")
    .order("starts_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Tüm Randevular</h1>
      <p className="mt-1 text-sm text-stone-500">Platform genelinde son 100 randevu.</p>

      <div className="mt-5 overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">İşletme</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Hizmet</th>
              <th className="px-4 py-3 font-medium">Ücret</th>
              <th className="px-4 py-3 font-medium">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(appointments ?? []).map((a: any) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  {new Date(a.starts_at).toLocaleDateString("tr-TR")} · {formatTime(a.starts_at)}
                </td>
                <td className="px-4 py-3 font-medium text-ink">{a.businesses?.name}</td>
                <td className="px-4 py-3">{a.customers?.full_name}</td>
                <td className="px-4 py-3">{a.services?.name}</td>
                <td className="px-4 py-3">{formatPrice(a.price_at_booking)}</td>
                <td className="px-4 py-3 capitalize text-stone-600">{a.status}</td>
              </tr>
            ))}
            {(appointments ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Henüz randevu yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
