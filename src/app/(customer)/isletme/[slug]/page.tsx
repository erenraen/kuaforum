import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusinessDetail } from "@/lib/queries";
import { BookingWidget } from "@/components/customer/BookingWidget";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { SiteFooter } from "@/components/customer/SiteFooter";
import { formatPrice, BUSINESS_TYPE_LABELS, WEEKDAY_NAMES } from "@/lib/utils";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const detail = await getBusinessDetail(params.slug);
  if (!detail) return {};
  const { business } = detail;
  const title = `${business.name} — ${business.districts?.name} | Online Randevu`;
  const description =
    business.description ||
    `${business.name} için müsaitlik takvimini gör, ücretsiz online randevu al.`;
  return {
    title,
    description,
    openGraph: { title, description, images: business.cover_url ? [business.cover_url] : undefined },
  };
}

export default async function BusinessDetailPage({ params }: Props) {
  const detail = await getBusinessDetail(params.slug);
  if (!detail) notFound();

  const { business, services, employees, hours, photos, reviews, isOpenNow } = detail;
  const startingPrice = services.length > 0 ? Math.min(...services.map((s) => s.price)) : null;

  return (
    <>
    <SiteHeader />
    <main className="pb-24 lg:pb-16">
      {/* KAPAK */}
      <div className="relative h-56 w-full bg-stone-200 sm:h-72">
        {business.cover_url ? (
          <Image src={business.cover_url} alt="" fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-stone-300 to-stone-100" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl2 border-4 border-white bg-stone-100 shadow-sm">
              {business.logo_url ? (
                <Image src={business.logo_url} alt={business.name} width={80} height={80} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-2xl italic text-stone-400">
                  {business.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl text-ink sm:text-3xl">{business.name}</h1>
                {business.is_verified && (
                  <span className="rounded-full bg-moss-50 px-2 py-0.5 text-xs font-medium text-moss-700">
                    Doğrulanmış İşletme
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-500">
                {BUSINESS_TYPE_LABELS[business.business_type]} · {business.districts?.name},{" "}
                {business.districts?.cities?.name}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-medium ${
              isOpenNow ? "bg-moss-50 text-moss-700" : "bg-stone-100 text-stone-500"
            }`}
          >
            {isOpenNow ? "Şu an açık" : "Şu an kapalı"}
          </span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            {business.description && (
              <section>
                <h2 className="font-display text-xl text-ink">Hakkında</h2>
                <p className="mt-2 text-stone-600">{business.description}</p>
                <p className="mt-2 text-xs text-stone-400">
                  Bilgiler {new Date(business.info_updated_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  tarihinde güncellendi.
                </p>
              </section>
            )}

            <section>
              <h2 className="font-display text-xl text-ink">Hizmetler ve Fiyatlar</h2>
              <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
                {services.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="font-medium text-ink">{s.name}</p>
                      {s.description && <p className="text-sm text-stone-500">{s.description}</p>}
                      <p className="text-xs text-stone-400">{s.duration_minutes} dk</p>
                    </div>
                    <span className="font-medium text-ink">{formatPrice(s.price)}</span>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="px-4 py-4 text-sm text-stone-500">Henüz hizmet eklenmemiş.</p>
                )}
              </div>
            </section>

            {employees.length > 0 && (
              <section>
                <h2 className="font-display text-xl text-ink">Çalışanlar</h2>
                <div className="mt-3 flex flex-wrap gap-4">
                  {employees.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl2 border border-stone-200 bg-white p-3">
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-stone-100">
                        {e.photo_url ? (
                          <Image src={e.photo_url} alt={e.full_name} width={44} height={44} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-stone-400">
                            {e.full_name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{e.full_name}</p>
                        {e.title && <p className="text-xs text-stone-500">{e.title}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {photos.length > 0 && (
              <section>
                <h2 className="font-display text-xl text-ink">Galeri</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((p: any) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-stone-100">
                      <Image src={p.url} alt="" fill className="object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="font-display text-xl text-ink">Çalışma Saatleri</h2>
              <div className="mt-3 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white text-sm">
                {hours
                  .slice()
                  .sort((a: any, b: any) => a.weekday - b.weekday)
                  .map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-stone-600">{WEEKDAY_NAMES[h.weekday]}</span>
                      <span className={h.is_closed ? "text-stone-400" : "font-medium text-ink"}>
                        {h.is_closed ? "Kapalı" : `${h.opens_at?.slice(0, 5)} – ${h.closes_at?.slice(0, 5)}`}
                      </span>
                    </div>
                  ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl text-ink">Yorumlar {reviews.length > 0 && `(${reviews.length})`}</h2>
              <div className="mt-3 space-y-3">
                {reviews.length === 0 && <p className="text-sm text-stone-500">Henüz yorum yok.</p>}
                {reviews.map((r: any) => (
                  <div key={r.id} className="rounded-xl2 border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-1 text-sm font-medium text-ink">
                      {"★".repeat(r.rating)}
                      <span className="text-stone-300">{"★".repeat(5 - r.rating)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-stone-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl2 border border-stone-200 bg-white p-5">
              <h2 className="font-display text-xl text-ink">İletişim</h2>
              <dl className="mt-3 space-y-1.5 text-sm">
                {business.address && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-400">Adres</dt>
                    <dd className="text-stone-700">{business.address}</dd>
                  </div>
                )}
                {business.phone && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-400">Telefon</dt>
                    <dd className="text-stone-700">{business.phone}</dd>
                  </div>
                )}
                {business.instagram_handle && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-stone-400">Instagram</dt>
                    <dd>
                      <a
                        href={`https://instagram.com/${business.instagram_handle}`}
                        target="_blank"
                        className="focus-ring text-moss-700 hover:underline"
                      >
                        @{business.instagram_handle}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          </div>

          {/* RANDEVU WIDGET (masaüstünde sticky, mobilde buraya aşağıdaki sabit çubukla gelinir) */}
          <div id="randevu" className="scroll-mt-20 lg:sticky lg:top-6 lg:self-start">
            <BookingWidget
              businessId={business.id}
              businessSlug={business.slug}
              businessName={business.name}
              services={services}
              employees={employees as any}
            />
            <Link
              href={`/r/${business.short_code}`}
              className="focus-ring mt-3 block rounded-xl2 border border-stone-200 bg-white px-4 py-3 text-center text-sm text-stone-500 hover:border-stone-300"
            >
              Instagram için kısa randevu linki: /r/{business.short_code}
            </Link>
          </div>
        </div>
      </div>
    </main>

    {/* Mobilde "Randevu Al" her zaman tek dokunuşla erişilebilir olsun diye
        sabit alt çubuk. Masaüstünde widget zaten sağ sütunda sticky
        olduğundan bu çubuk sadece lg altında görünür. */}
    <a
      href="#randevu"
      className="focus-ring fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{business.name}</p>
        {startingPrice != null && (
          <p className="text-xs text-stone-500">{formatPrice(startingPrice)}&apos;den başlayan</p>
        )}
      </div>
      <span className="shrink-0 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white">Randevu Al</span>
    </a>

    <SiteFooter />
    </>
  );
}
