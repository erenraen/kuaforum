import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-ink">Kuaförüm</p>
          <p className="text-sm text-stone-500">Müşteri için tamamen ücretsiz randevu platformu.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
          <Link href="/isletmeniz-icin" className="focus-ring hover:text-ink">İşletmeler için</Link>
          <Link href="/giris" className="focus-ring hover:text-ink">İşletme girişi</Link>
          <Link href="/hakkimizda" className="focus-ring hover:text-ink">Hakkımızda</Link>
          <Link href="/gizlilik" className="focus-ring hover:text-ink">Gizlilik</Link>
        </div>
      </div>
    </footer>
  );
}
