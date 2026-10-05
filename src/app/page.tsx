import Link from "next/link";
import { SearchBar } from "@/components/customer/SearchBar";
import { BusinessCard } from "@/components/customer/BusinessCard";
import {
  listCities,
  listDistrictsByCity,
  listCategories,
  listPopularDistricts,
  listFeaturedBusinesses,
  listLastMinuteSlots,
} from "@/lib/queries";
import { formatPrice, formatTime } from "@/lib/utils";

export default async function HomePage() {
  const [cities, districtsByCity, categories, popularDistricts, featured, lastMinute] =
    await Promise.all([
      listCities(),
      listDistrictsByCity(),
      listCategories(),
      listPopularDistricts(),
      listFeaturedBusinesses(6),
      listLastMinuteSlots(6),
    ]);

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-stone-50 to-paper">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
              Yakınındaki kuaförü bul.
              <br />
              Boş saatini seç. <span className="italic">Randevunu al.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-stone-600">
              Bulunduğun bölgedeki kuaför ve berberleri keşfet, hizmetleri ve fiyatları incele,
              sana uygun saati seç.
            </p>
          </div>

          <div className="mt-10">
            <SearchBar cities={cities} districtsByCity={districtsByCity} categories={categories} />
          </div>
        </div>
      </section>

      {/* POPÜLER İLÇELER */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading title="Popüler ilçeler" subtitle="En çok tercih edilen bölgeler" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {popularDistricts.map((d: any) => (
            <Link
              key={d.id}
              href={`/${d.cities.slug}/${d.slug}/berberler`}
              className="focus-ring rounded-xl2 border border-stone-200 bg-white px-4 py-5 text-center transition-colors hover:border-moss-300 hover:bg-moss-50"
            >
              <span className="font-display text-lg text-ink">{d.name}</span>
              <p className="mt-1 text-xs text-stone-500">{d.cities.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SON DAKİKA */}
      {lastMinute.length > 0 && (
        <section className="border-y border-clay-100 bg-clay-50/60 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading title="🔥 Son dakika boşlukları" subtitle="Az önce açılan, hemen alınabilecek saatler" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lastMinute.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/isletme/${s.businesses?.slug}`}
                  className="focus-ring flex items-center justify-between rounded-xl2 border border-clay-100 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium text-ink">{s.businesses?.name}</p>
                    <p className="text-sm text-stone-500">
                      {s.services?.name} · {s.businesses?.districts?.name}
                    </p>
                  </div>
                  <span className="rounded-full bg-clay-500 px-3 py-1 text-sm font-medium text-white">
                    {formatTime(s.starts_at)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BUGÜN & YAKINDAKİ İŞLETMELER */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading title="Bugün randevu alınabilen işletmeler" subtitle="Hemen müsait saati olan salonlar" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((b) => (
            <BusinessCard key={b.slug} b={b} />
          ))}
        </div>
        {featured.length === 0 && (
          <p className="text-stone-500">
            Henüz aktif işletme bulunmuyor. Örnek verileri yüklediğinizden emin olun.
          </p>
        )}
      </section>

      {/* NASIL ÇALIŞIR */}
      <section className="border-t border-stone-200 bg-stone-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading title="Nasıl çalışır?" subtitle="Üç adımda randevunu al" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { title: "Bölgeni seç", body: "İlini, ilçeni ve almak istediğin hizmeti belirle." },
              { title: "Uygun saati gör", body: "İşletmenin gerçek zamanlı müsaitlik takvimine bak." },
              { title: "Ücretsiz randevu al", body: "Ad, telefon ve saat bilgisiyle saniyeler içinde onayla." },
            ].map((step, i) => (
              <div key={step.title} className="rounded-xl2 border border-stone-200 bg-white p-6">
                <span className="font-display text-3xl italic text-moss-600">{i + 1}</span>
                <h3 className="mt-3 font-display text-xl text-ink">{step.title}</h3>
                <p className="mt-2 text-sm text-stone-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* İŞLETMELER İÇİN */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 items-center gap-8 rounded-xl2 bg-ink px-8 py-12 text-white sm:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl leading-tight">
              Instagram&apos;dan müşterilerini platforma getir.
            </h2>
            <p className="mt-4 text-stone-300">
              İşletmenizi sisteme biz ekleyelim, ilk 3 gün ücretsiz deneyin. Yeni müşteriler
              kazanın ve isterseniz kendi randevu web sitenize sahip olun.
            </p>
            <Link
              href="/isletmeniz-icin"
              className="focus-ring mt-6 inline-flex items-center rounded-lg bg-white px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-stone-200"
            >
              İşletmeni ekle
            </Link>
          </div>
          <div className="rounded-xl2 bg-white/5 p-6 text-sm text-stone-300">
            <p>&quot;Instagram&apos;dan bize yazın. Bilgilerinizi gönderin.</p>
            <p>Ödeme sonrası işletmenizi biz sisteme ekleyelim.&quot;</p>
            <p className="mt-4 text-stone-400">— Kuaförüm onboarding süreci</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
    </div>
  );
}

function Footer() {
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
