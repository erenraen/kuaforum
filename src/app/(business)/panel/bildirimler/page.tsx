import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABELS: Record<string, string> = {
  appointment_created: "Yeni randevu",
  appointment_confirmed: "Randevu onaylandı",
  appointment_canceled: "Randevu iptal edildi",
  appointment_rescheduled: "Randevu yeniden planlandı",
  appointment_completed: "Randevu tamamlandı",
  appointment_no_show: "Müşteri gelmedi",
  appointment_reminder: "Randevu hatırlatması",
  waitlist_slot_available: "Bekleme listesi: saat boşaldı",
  payment_success: "Ödeme alındı",
  payment_failed: "Ödeme başarısız",
};

export default async function NotificationsPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Bildirimler</h1>
      <p className="mt-1 max-w-lg text-sm text-stone-500">
        Randevu ve ödeme olaylarının uygulama içi günlüğü. Şu an SMS/e-posta gönderimi aktif
        değil — bu liste sadece burada görünür.
      </p>

      <div className="mt-5 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
        {(notifications ?? []).map((n: any) => (
          <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3.5 text-sm">
            <div>
              <p className="font-medium text-ink">{TYPE_LABELS[n.type] ?? n.type}</p>
              <p className="text-stone-500">{n.message}</p>
            </div>
            <span className="shrink-0 text-xs text-stone-400">
              {new Date(n.created_at).toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
        {(notifications ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-stone-500">Henüz bildirim yok.</p>
        )}
      </div>
    </div>
  );
}
