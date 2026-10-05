import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [
    { count: totalBusinesses },
    { count: activeBusinesses },
    { count: pendingBusinesses },
    { count: trialBusinesses },
    { count: totalAppointments },
    { count: todayAppointments },
    { data: recentBusinesses },
  ] = await Promise.all([
    supabase.from("businesses").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("subscription_status", "trial"),
    supabase.from("appointments").select("*", { count: "exact", head: true }),
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("starts_at", new Date().toISOString().slice(0, 10)),
    supabase
      .from("businesses")
      .select("name, slug, status, created_at, districts(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: "Toplam işletme", value: totalBusinesses ?? 0 },
    { label: "Aktif işletme", value: activeBusinesses ?? 0 },
    { label: "Onay bekleyen", value: pendingBusinesses ?? 0 },
    { label: "Deneme sürecinde", value: trialBusinesses ?? 0 },
    { label: "Toplam randevu", value: totalAppointments ?? 0 },
    { label: "Bugünkü randevu", value: todayAppointments ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Genel İstatistikler</h1>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl2 border border-stone-200 bg-white p-5">
            <p className="text-2xl font-medium text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg text-ink">Son eklenen işletmeler</h2>
        <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
          {(recentBusinesses ?? []).map((b: any) => (
            <div key={b.slug} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">{b.name}</p>
                <p className="text-stone-500">{b.districts?.name}</p>
              </div>
              <span className="text-xs text-stone-400">{new Date(b.created_at).toLocaleDateString("tr-TR")}</span>
            </div>
          ))}
          {(recentBusinesses ?? []).length === 0 && (
            <p className="px-4 py-6 text-center text-stone-500">Henüz işletme eklenmedi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
