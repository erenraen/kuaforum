import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewsPage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*, customers(full_name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const avg = business.rating_avg;
  const count = business.rating_count;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Yorumlar</h1>

      <div className="mt-4 flex items-center gap-3 rounded-xl2 border border-stone-200 bg-white p-5">
        <span className="font-display text-3xl text-ink">{avg > 0 ? avg.toFixed(1) : "—"}</span>
        <div>
          <div className="text-clay-500">{"★".repeat(Math.round(avg))}<span className="text-stone-200">{"★".repeat(5 - Math.round(avg))}</span></div>
          <p className="text-sm text-stone-500">{count} değerlendirme</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {(reviews ?? []).map((r: any) => (
          <div key={r.id} className="rounded-xl2 border border-stone-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-clay-500">
                {"★".repeat(r.rating)}
                <span className="text-stone-200">{"★".repeat(5 - r.rating)}</span>
              </div>
              <span className="text-xs text-stone-400">
                {new Date(r.created_at).toLocaleDateString("tr-TR")}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-stone-600">{r.comment}</p>}
            <p className="mt-1 text-xs text-stone-400">{r.customers?.full_name ?? "Müşteri"}</p>
          </div>
        ))}
        {(reviews ?? []).length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">Henüz yorum yok.</p>
        )}
      </div>
    </div>
  );
}
