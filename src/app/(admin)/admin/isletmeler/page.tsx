import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BusinessAdminActions } from "@/components/admin/BusinessAdminActions";
import { BUSINESS_TYPE_LABELS } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Onay Bekliyor",
  active: "Aktif",
  rejected: "Reddedildi",
  suspended: "Askıya Alındı",
};

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: { durum?: string };
}) {
  const status = searchParams.durum ?? "all";
  const supabase = createClient();

  let query = supabase
    .from("businesses")
    .select("id, name, slug, status, is_verified, subscription_status, created_at, districts(name), categories(name)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data: businesses } = await query;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">İşletmeler</h1>
        <Link href="/admin/isletmeler/yeni" className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700">
          + Yeni İşletme Ekle
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["all", "pending", "active", "suspended", "rejected"].map((s) => (
          <a
            key={s}
            href={`?durum=${s}`}
            className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm ${
              status === s ? "border-ink bg-ink text-white" : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            {s === "all" ? "Tümü" : STATUS_LABELS[s]}
          </a>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-500">
              <th className="px-4 py-3 font-medium">İşletme</th>
              <th className="px-4 py-3 font-medium">Bölge</th>
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Üyelik</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(businesses ?? []).map((b: any) => (
              <tr key={b.id}>
                <td className="px-4 py-3">
                  <Link href={`/isletme/${b.slug}`} target="_blank" className="focus-ring font-medium text-ink hover:underline">
                    {b.name}
                  </Link>
                  {b.is_verified && <span className="ml-2 rounded-full bg-moss-50 px-2 py-0.5 text-[11px] text-moss-700">Doğrulanmış</span>}
                </td>
                <td className="px-4 py-3 text-stone-600">{b.districts?.name}</td>
                <td className="px-4 py-3 text-stone-600">{b.categories?.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                    {STATUS_LABELS[b.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-600 capitalize">{b.subscription_status}</td>
                <td className="px-4 py-3">
                  <BusinessAdminActions businessId={b.id} status={b.status} isVerified={b.is_verified} />
                </td>
              </tr>
            ))}
            {(businesses ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">İşletme bulunamadı.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
