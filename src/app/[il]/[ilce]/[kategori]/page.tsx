import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BusinessCard } from "@/components/customer/BusinessCard";
import { DiscoveryFilters } from "@/components/customer/DiscoveryFilters";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { SiteFooter } from "@/components/customer/SiteFooter";
import { listBusinessesByDistrictAndCategory } from "@/lib/queries";

type Props = {
  params: { il: string; ilce: string; kategori: string };
  searchParams: {
    sirala?: string;
    bugun?: string;
    acik?: string;
    fiyatMin?: string;
    fiyatMax?: string;
    puan?: string;
    lat?: string;
    lng?: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = await listBusinessesByDistrictAndCategory({
    citySlug: params.il,
    districtSlug: params.ilce,
    categorySlug: params.kategori,
  });
  if (!result) return {};

  const title = `${result.categoryName} — ${result.districtName}, ${result.cityName}`;
  const description = `${result.districtName} bölgesindeki ${result.categoryName.toLowerCase()} keşfet, müsaitlik takvimini gör, ücretsiz online randevu al.`;
  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function DiscoveryPage({ params, searchParams }: Props) {
  const lat = searchParams.lat ? Number(searchParams.lat) : undefined;
  const lng = searchParams.lng ? Number(searchParams.lng) : undefined;

  const result = await listBusinessesByDistrictAndCategory({
    citySlug: params.il,
    districtSlug: params.ilce,
    categorySlug: params.kategori,
    sort: (searchParams.sirala as any) ?? "onerilen",
    onlyToday: searchParams.bugun === "1",
    openNowOnly: searchParams.acik === "1",
    minPrice: searchParams.fiyatMin ? Number(searchParams.fiyatMin) : undefined,
    maxPrice: searchParams.fiyatMax ? Number(searchParams.fiyatMax) : undefined,
    minRating: searchParams.puan ? Number(searchParams.puan) : undefined,
    userLat: lat,
    userLng: lng,
  });

  if (!result) notFound();

  const { businesses, districtName, cityName, categoryName } = result;
  const hasActiveFilters =
    searchParams.bugun === "1" || searchParams.acik === "1" || searchParams.fiyatMin || searchParams.fiyatMax || searchParams.puan;

  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-2 text-sm text-stone-500">
        <Link href="/" className="focus-ring hover:text-ink">Anasayfa</Link>
        <span className="mx-1.5">/</span>
        <span>{cityName}</span>
        <span className="mx-1.5">/</span>
        <span>{districtName}</span>
      </nav>

      <h1 className="font-display text-3xl text-ink">
        {districtName} — {categoryName}
      </h1>
      <p className="mt-1 text-stone-500">
        {businesses.length} işletme bulundu · {cityName}, {districtName}
      </p>

      <div className="mt-6">
        <DiscoveryFilters hasUserLocation={lat != null && lng != null} />
      </div>

      {businesses.length === 0 ? (
        <div className="mt-12 rounded-xl2 border border-dashed border-stone-300 p-12 text-center">
          <p className="font-display text-xl text-ink">
            {hasActiveFilters ? "Bu filtrelere uyan işletme yok" : "Bu bölgede henüz işletme yok"}
          </p>
          <p className="mt-2 text-sm text-stone-500">
            {hasActiveFilters
              ? "Filtreleri gevşeterek tekrar dene."
              : "Yakında bu bölgede yeni işletmeler eklenecek. Başka bir ilçe deneyebilirsin."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <BusinessCard key={b.slug} b={b} />
          ))}
        </div>
      )}
    </main>
    <SiteFooter />
    </>
  );
}
