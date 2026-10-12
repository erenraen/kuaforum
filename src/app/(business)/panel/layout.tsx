import Link from "next/link";
import { getCurrentBusiness } from "@/lib/business";
import { LogoutButton } from "@/components/business/LogoutButton";
import { PanelMobileNav } from "@/components/business/PanelMobileNav";

const NAV = [
  { href: "/panel", label: "Dashboard" },
  { href: "/panel/randevular", label: "Randevular" },
  { href: "/panel/takvim", label: "Takvim" },
  { href: "/panel/checkin", label: "Check-in" },
  { href: "/panel/bildirimler", label: "Bildirimler" },
  { href: "/panel/musteriler", label: "Müşteriler" },
  { href: "/panel/bekleme-listesi", label: "Bekleme Listesi" },
  { href: "/panel/hizmetler", label: "Hizmetler" },
  { href: "/panel/calisanlar", label: "Çalışanlar" },
  { href: "/panel/calisma-saatleri", label: "Çalışma Saatleri" },
  { href: "/panel/profil", label: "İşletme Profili" },
  { href: "/panel/galeri", label: "Galeri" },
  { href: "/panel/yorumlar", label: "Yorumlar" },
  { href: "/panel/son-dakika", label: "Son Dakika" },
  { href: "/panel/paket", label: "Paket / Üyelik" },
  { href: "/panel/web-sitesi", label: "Kendi Web Sitem" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { business } = await getCurrentBusiness();

  return (
    <div className="min-h-screen bg-stone-50">
      <PanelMobileNav items={NAV} businessName={business?.name} />
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-60 shrink-0 border-r border-stone-200 bg-white px-4 py-6 sm:block">
          <Link href="/" className="font-display text-lg text-ink">Kuaförüm</Link>
          {business && (
            <p className="mt-1 truncate text-xs text-stone-400">{business.name}</p>
          )}
          <nav className="mt-6 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring rounded-lg px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 border-t border-stone-200 pt-4">
            <LogoutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          {!business ? (
            <div className="mx-auto max-w-lg rounded-xl2 border border-dashed border-stone-300 bg-white p-8 text-center">
              <h1 className="font-display text-xl text-ink">Henüz size atanmış bir işletme yok</h1>
              <p className="mt-2 text-sm text-stone-500">
                İşletmenizi platforma eklemek için Instagram üzerinden bizimle iletişime geçin;
                hesabınıza gerekli erişimi tanımlayalım.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
