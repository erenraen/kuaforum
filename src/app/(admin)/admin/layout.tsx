import Link from "next/link";
import { LogoutButton } from "@/components/business/LogoutButton";

const NAV = [
  { href: "/admin", label: "Genel İstatistikler" },
  { href: "/admin/isletmeler", label: "İşletmeler" },
  { href: "/admin/isletmeler/yeni", label: "Yeni İşletme Ekle" },
  { href: "/admin/randevular", label: "Randevular" },
  { href: "/admin/sehir-ilce", label: "Şehirler / İlçeler" },
  { href: "/admin/kategoriler", label: "Kategoriler" },
  { href: "/admin/paketler", label: "Paketler" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-stone-200 bg-white px-4 py-6 sm:block">
          <Link href="/" className="font-display text-lg text-ink">Kuaförüm</Link>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-clay-500">Admin</p>
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
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
