import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  trial: "Ücretsiz Deneme",
  active: "Aktif Üyelik",
  past_due: "Ödeme Gecikti",
  canceled: "İptal Edildi",
  expired: "Deneme Süresi Doldu",
};

export default async function PlanPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const [{ data: plans }, { data: subscriptions }] = await Promise.all([
    supabase.from("plans").select("*").eq("is_active", true).order("sort_order"),
    supabase
      .from("subscriptions")
      .select("*, plans(name)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const trialDaysLeft = business.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(business.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;
  const isExpired = business.subscription_status === "expired";

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Paket / Üyelik</h1>

      {/* Ödeme entegrasyonunun durumu hakkında net, yanıltmayan bilgi */}
      <div className="mt-4 rounded-xl2 border border-clay-100 bg-clay-50 px-4 py-3 text-sm text-clay-700">
        ⚠️ <strong>Ödeme entegrasyonu henüz aktif değil.</strong> Aşağıdaki paketler gerçek bir
        ödeme alıp sizi otomatik olarak yükseltmez — bu MVP'de kasıtlı olarak sadece bilgilendirme
        amaçlıdır. Plan değiştirmek için platform yöneticinizle iletişime geçin.
      </div>

      <div className="mt-4 rounded-xl2 border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-500">Mevcut durum</p>
        <p className="mt-1 font-display text-xl text-ink">
          {STATUS_LABELS[business.subscription_status] ?? business.subscription_status}
        </p>
        {business.subscription_status === "trial" && trialDaysLeft !== null && (
          <p className="mt-1 text-sm text-clay-600">{trialDaysLeft} gün sonra sona erecek</p>
        )}
        {isExpired && (
          <p className="mt-1 text-sm text-red-600">
            Ücretsiz deneme süreniz doldu. İşletmeniz keşif sayfalarında görünmeye devam ediyor,
            ancak bir plana geçmek için platform yöneticinizle iletişime geçmenizi öneririz.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(plans ?? []).map((p) => (
          <div
            key={p.id}
            className={`rounded-xl2 border p-5 ${p.is_featured ? "border-ink bg-ink text-white" : "border-stone-200 bg-white"}`}
          >
            {p.is_featured && (
              <span className="rounded-full bg-clay-500 px-2 py-0.5 text-xs font-medium text-white">Önerilen</span>
            )}
            <h3 className="mt-2 font-display text-lg">{p.name}</h3>
            <p className={`mt-1 text-sm ${p.is_featured ? "text-stone-300" : "text-stone-500"}`}>{p.description}</p>
            <p className="mt-3 text-2xl font-medium">
              {formatPrice(p.price)}
              <span className="text-sm font-normal"> / ay</span>
            </p>
            <button
              disabled
              title="Ödeme entegrasyonu henüz aktif değil"
              className={`focus-ring mt-4 w-full cursor-not-allowed rounded-lg px-4 py-2.5 text-sm font-medium ${
                p.is_featured ? "bg-white text-ink" : "bg-ink text-white"
              } opacity-50`}
            >
              Ödeme entegrasyonu yakında
            </button>
          </div>
        ))}
      </div>

      {(subscriptions ?? []).length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg text-ink">Geçmiş İşlemler</h2>
          <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
            {subscriptions!.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{s.plans?.name}</span>
                <span className="text-stone-500">{formatPrice(s.amount)} · {s.payment_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
