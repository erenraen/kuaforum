import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBusinessDetail } from "@/lib/queries";
import { BookingWidget } from "@/components/customer/BookingWidget";
import { formatPrice, WEEKDAY_NAMES } from "@/lib/utils";

type Props = { params: { slug: string } };

// Bu sayfa, işletmenin panelde girdiği verilerden (logo, renk, hizmetler,
// çalışanlar, fotoğraflar, açıklama) otomatik üretilir — işletmenin yeni bir
// proje kodlatmasına gerek kalmaz. Aynı randevu motorunu ve aynı veritabanını
// kullanır; buradan alınan randevu platform panelinde de görünür.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getBusinessDetail(params.slug);
  if (!detail) return {};
  return { title: detail.business.name, description: detail.business.description ?? undefined };
}

export default async function BusinessOwnSitePage({ params }: Props) {
  const detail = await getBusinessDetail(params.slug);
  if (!detail || !detail.business.has_own_website) notFound();

  const { business, services, employees, hours, photos } = detail;
  const brand = business.brand_color || "#111827";

  return (
    <div style={{ ["--brand" as any]: brand }}>
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <Image src={business.logo_url} alt={business.name} width={36} height={36} className="rounded-full object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: brand }}
              >
                {business.name.slice(0, 1)}
              </div>
            )}
            <span className="font-display text-lg text-ink">{business.name}</span>
          </div>
          <a href="#randevu" className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: brand }}>
            Online Randevu
          </a>
        </div>
      </header>

      {/* ANA SAYFA */}
      <section className="relative h-64 w-full bg-stone-200 sm:h-80">
        {business.cover_url && <Image src={business.cover_url} alt="" fill className="object-cover" />}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent">
          <div className="mx-auto w-full max-w-5xl px-4 pb-6 text-white">
            <h1 className="font-display text-3xl">{business.name}</h1>
            <p className="text-sm text-white/80">{business.districts?.name}, {business.districts?.cities?.name}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* HAKKIMIZDA */}
        {business.description && (
          <section id="hakkimizda" className="mb-12">
            <h2 className="font-display text-2xl text-ink">Hakkımızda</h2>
            <p className="mt-2 max-w-2xl text-stone-600">{business.description}</p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            {/* HİZMETLER + FİYATLAR */}
            <section id="hizmetler">
              <h2 className="font-display text-2xl text-ink">Hizmetler ve Fiyatlar</h2>
              <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-stone-400">{s.duration_minutes} dk</p>
                    </div>
                    <span className="font-medium" style={{ color: brand }}>{formatPrice(s.price)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ÇALIŞANLAR */}
            {employees.length > 0 && (
              <section id="calisanlar">
                <h2 className="font-display text-2xl text-ink">Ekibimiz</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {employees.map((e) => (
                    <div key={e.id} className="rounded-xl2 border border-stone-200 bg-white p-4 text-center">
                      <div className="mx-auto h-14 w-14 overflow-hidden rounded-full bg-stone-100">
                        {e.photo_url && <Image src={e.photo_url} alt={e.full_name} width={56} height={56} className="h-full w-full object-cover" />}
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink">{e.full_name}</p>
                      {e.title && <p className="text-xs text-stone-500">{e.title}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* GALERİ */}
            {photos.length > 0 && (
              <section id="galeri">
                <h2 className="font-display text-2xl text-ink">Galeri</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((p: any) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
                      <Image src={p.url} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* İLETİŞİM */}
            <section id="iletisim">
              <h2 className="font-display text-2xl text-ink">İletişim</h2>
              <div className="mt-3 rounded-xl2 border border-stone-200 bg-white p-5 text-sm">
                {business.address && <p className="text-stone-600">{business.address}</p>}
                {business.phone && <p className="mt-1 text-stone-600">{business.phone}</p>}
                <div className="mt-3 divide-y divide-stone-100">
                  {hours
                    .slice()
                    .sort((a: any, b: any) => a.weekday - b.weekday)
                    .map((h: any) => (
                      <div key={h.id} className="flex justify-between py-1.5">
                        <span className="text-stone-500">{WEEKDAY_NAMES[h.weekday]}</span>
                        <span className="text-ink">{h.is_closed ? "Kapalı" : `${h.opens_at?.slice(0, 5)}–${h.closes_at?.slice(0, 5)}`}</span>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          </div>

          {/* ONLINE RANDEVU */}
          <div id="randevu" className="lg:sticky lg:top-24 lg:self-start">
            <BookingWidget
              businessId={business.id}
              businessSlug={business.slug}
              businessName={business.name}
              services={services}
              employees={employees as any}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        {business.name} · Kuaförüm altyapısıyla oluşturulmuştur.
      </footer>
    </div>
  );
}
