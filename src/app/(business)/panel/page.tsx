import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatTime, istanbulDayBounds } from "@/lib/utils";

export default async function DashboardPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { start: todayStart, end: todayEnd } = istanbulDayBounds();

  const [{ data: todayAppts }, { count: totalAppts }, { data: upcoming }, { data: allAppts }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, services(name, duration_minutes), customers(full_name)")
      .eq("business_id", business.id)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .neq("status", "canceled")
      .order("starts_at"),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id),
    supabase
      .from("appointments")
      .select("*, services(name), customers(full_name)")
      .eq("business_id", business.id)
      .gt("starts_at", new Date().toISOString())
      .neq("status", "canceled")
      .order("starts_at")
      .limit(5),
    // Gerçek istatistikler (madde 12): toplam müşteri, en çok tercih edilen
    // hizmet, en yoğun saat — hepsi burada gerçek randevu verisinden türetilir.
    supabase
      .from("appointments")
      .select("customer_id, status, starts_at, services(name)")
      .eq("business_id", business.id),
  ]);

  const busyMinutes = (todayAppts ?? []).reduce((sum, a: any) => sum + (a.services?.duration_minutes ?? 0), 0);
  const trialDaysLeft = business.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const uniqueCustomers = new Set((allAppts ?? []).map((a: any) => a.customer_id)).size;
  const completedCount = (allAppts ?? []).filter((a: any) => a.status === "completed").length;
  const canceledCount = (allAppts ?? []).filter((a: any) => a.status === "canceled").length;
  const noShowCount = (allAppts ?? []).filter((a: any) => a.status === "no_show").length;

  const serviceCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  for (const a of (allAppts ?? []) as any[]) {
    if (a.services?.name) serviceCounts.set(a.services.name, (serviceCounts.get(a.services.name) ?? 0) + 1);
    // İstanbul saatine göre saat dilimi (sunucu/Node saat dilimine bağımlı değil)
    const istanbulHour = Number(
      new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }).format(
        new Date(a.starts_at)
      )
    );
    hourCounts.set(istanbulHour, (hourCounts.get(istanbulHour) ?? 0) + 1);
  }
  const topService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const topHourEntry = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topHour = topHourEntry ? `${String(topHourEntry[0]).padStart(2, "0")}:00` : "—";

  const stats = [
    { label: "Bugünkü randevular", value: todayAppts?.length ?? 0 },
    { label: "Bugünkü doluluk", value: `${Math.round(busyMinutes / 60 * 10) / 10} saat` },
    { label: "Toplam randevu", value: totalAppts ?? 0 },
    { label: "Profil görüntülenme", value: business.profile_view_count },
    { label: "Toplam müşteri", value: uniqueCustomers },
    { label: "Tamamlanan", value: completedCount },
    { label: "İptal", value: canceledCount },
    { label: "Gelmedi", value: noShowCount },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-stone-500">{business.name}</p>

      {business.subscription_status === "trial" && trialDaysLeft !== null && (
        <div className="mt-4 rounded-xl2 border border-clay-100 bg-clay-50 px-4 py-3 text-sm text-clay-600">
          Ücretsiz deneme sürenizin bitmesine <strong>{trialDaysLeft} gün</strong> kaldı.{" "}
          <a href="/panel/paket" className="focus-ring underline">Paketleri incele</a>
        </div>
      )}
      {business.subscription_status === "expired" && (
        <div className="mt-4 rounded-xl2 border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          Ücretsiz deneme süreniz doldu.{" "}
          <a href="/panel/paket" className="focus-ring underline">Paket durumunu görüntüleyin</a>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl2 border border-stone-200 bg-white p-5">
            <p className="text-2xl font-medium text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-stone-500">{s.label}</p>
          </div>
        ))}
        <div className="rounded-xl2 border border-stone-200 bg-white p-5">
          <p className="truncate text-sm font-medium text-ink">{topService}</p>
          <p className="mt-1 text-sm text-stone-500">En çok tercih edilen hizmet</p>
        </div>
        <div className="rounded-xl2 border border-stone-200 bg-white p-5">
          <p className="text-sm font-medium text-ink">{topHour}</p>
          <p className="mt-1 text-sm text-stone-500">En yoğun saat</p>
        </div>
        <div className="rounded-xl2 border border-stone-200 bg-white p-5">
          <p className="text-sm font-medium capitalize text-ink">
            {business.subscription_status === "trial"
              ? "Deneme"
              : business.subscription_status === "expired"
              ? "Süresi Doldu"
              : business.subscription_status}
          </p>
          <p className="mt-1 text-sm text-stone-500">Üyelik durumu</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg text-ink">Bugünkü randevular</h2>
          <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
            {(todayAppts ?? []).length === 0 && (
              <p className="px-4 py-4 text-sm text-stone-500">Bugün için randevu yok.</p>
            )}
            {(todayAppts ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{formatTime(a.starts_at)} — {a.customers?.full_name}</p>
                  <p className="text-stone-500">{a.services?.name}</p>
                </div>
                <StatusPill status={a.status} />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg text-ink">Yaklaşan randevular</h2>
          <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
            {(upcoming ?? []).length === 0 && (
              <p className="px-4 py-4 text-sm text-stone-500">Yaklaşan randevu yok.</p>
            )}
            {(upcoming ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{a.customers?.full_name}</p>
                  <p className="text-stone-500">
                    {a.services?.name} · {new Date(a.starts_at).toLocaleDateString("tr-TR")}{" "}
                    {formatTime(a.starts_at)}
                  </p>
                </div>
                <span className="text-stone-400">{formatPrice(a.price_at_booking)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-stone-100 text-stone-600",
    confirmed: "bg-moss-50 text-moss-700",
    completed: "bg-stone-800 text-white",
    canceled: "bg-red-50 text-red-600",
    no_show: "bg-clay-50 text-clay-600",
  };
  const labels: Record<string, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    completed: "Tamamlandı",
    canceled: "İptal edildi",
    no_show: "Gelmedi",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
