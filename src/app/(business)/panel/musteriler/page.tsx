import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function CustomersPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  // Gerçek randevu verisinden türetilmiş CRM listesi — mock sayı yok.
  const { data: appointments } = await supabase
    .from("appointments")
    .select("customer_id, status, price_at_booking, starts_at, customers(full_name, phone)")
    .eq("business_id", business.id);

  const byCustomer = new Map<
    string,
    {
      name: string;
      phone: string;
      total: number;
      completed: number;
      canceled: number;
      noShow: number;
      totalSpent: number;
      lastVisit: string | null;
    }
  >();

  for (const a of appointments ?? []) {
    const customer: any = a.customers;
    if (!customer) continue;
    const key = a.customer_id;
    const entry = byCustomer.get(key) ?? {
      name: customer.full_name,
      phone: customer.phone,
      total: 0,
      completed: 0,
      canceled: 0,
      noShow: 0,
      totalSpent: 0,
      lastVisit: null,
    };
    entry.total += 1;
    if (a.status === "completed") {
      entry.completed += 1;
      entry.totalSpent += Number(a.price_at_booking);
      if (!entry.lastVisit || a.starts_at > entry.lastVisit) entry.lastVisit = a.starts_at;
    }
    if (a.status === "canceled") entry.canceled += 1;
    if (a.status === "no_show") entry.noShow += 1;
    byCustomer.set(key, entry);
  }

  const customers = Array.from(byCustomer.values()).sort((a, b) => b.total - a.total);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Müşteriler</h1>
      <p className="mt-1 text-sm text-stone-500">{customers.length} müşteri · gerçek randevu verisinden hesaplanır</p>

      <div className="mt-5 overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Toplam Randevu</th>
              <th className="px-4 py-3 font-medium">Tamamlanan</th>
              <th className="px-4 py-3 font-medium">İptal</th>
              <th className="px-4 py-3 font-medium">Gelmedi</th>
              <th className="px-4 py-3 font-medium">Toplam Harcama</th>
              <th className="px-4 py-3 font-medium">Son Ziyaret</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {customers.map((c) => (
              <tr key={c.phone}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-stone-400">{c.phone}</p>
                </td>
                <td className="px-4 py-3">{c.total}</td>
                <td className="px-4 py-3">{c.completed}</td>
                <td className="px-4 py-3">{c.canceled}</td>
                <td className="px-4 py-3">{c.noShow > 0 ? <span className="text-clay-600">{c.noShow}</span> : 0}</td>
                <td className="px-4 py-3">{formatPrice(c.totalSpent)}</td>
                <td className="px-4 py-3 text-stone-500">
                  {c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("tr-TR") : "—"}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-500">Henüz müşteri yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
