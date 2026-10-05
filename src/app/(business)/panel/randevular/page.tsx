import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatTime } from "@/lib/utils";
import { StatusPill } from "../page";
import { AppointmentActions } from "@/components/business/AppointmentActions";

const TABS = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Bekliyor" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "completed", label: "Tamamlandı" },
  { value: "canceled", label: "İptal edildi" },
];

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { durum?: string };
}) {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const status = searchParams.durum ?? "all";
  const supabase = createClient();

  let query = supabase
    .from("appointments")
    .select("*, services(name), employees(full_name), customers(full_name, phone)")
    .eq("business_id", business.id)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (status !== "all") query = query.eq("status", status);

  const { data: appointments } = await query;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Randevular</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.value}
            href={`?durum=${tab.value}`}
            className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm ${
              status === tab.value
                ? "border-ink bg-ink text-white"
                : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-3 font-medium">Tarih / Saat</th>
              <th className="px-4 py-3 font-medium">Müşteri</th>
              <th className="px-4 py-3 font-medium">Hizmet</th>
              <th className="px-4 py-3 font-medium">Çalışan</th>
              <th className="px-4 py-3 font-medium">Ücret</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(appointments ?? []).map((a: any) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  {new Date(a.starts_at).toLocaleDateString("tr-TR")} · {formatTime(a.starts_at)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{a.customers?.full_name}</p>
                  <p className="text-xs text-stone-400">{a.customers?.phone}</p>
                </td>
                <td className="px-4 py-3">{a.services?.name}</td>
                <td className="px-4 py-3">{a.employees?.full_name}</td>
                <td className="px-4 py-3">{formatPrice(a.price_at_booking)}</td>
                <td className="px-4 py-3"><StatusPill status={a.status} /></td>
                <td className="px-4 py-3"><AppointmentActions id={a.id} status={a.status} /></td>
              </tr>
            ))}
            {(appointments ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  Bu filtrede randevu bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
