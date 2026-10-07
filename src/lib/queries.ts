import { createClient } from "@/lib/supabase/server";
import type { City, District, Category, BusinessHours } from "@/types/database";
import type { BusinessCardData } from "@/components/customer/BusinessCard";

// İstanbul saatine göre "şu an açık mı" hesaplar.
export function isOpenNow(hours: Pick<BusinessHours, "weekday" | "is_closed" | "opens_at" | "closes_at">[]) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  const weekday = now.getDay();
  const today = hours.find((h) => h.weekday === weekday);
  if (!today || today.is_closed || !today.opens_at || !today.closes_at) return false;

  const [oh, om] = today.opens_at.split(":").map(Number);
  const [ch, cm] = today.closes_at.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= oh * 60 + om && minutesNow < ch * 60 + cm;
}

export async function listCities(): Promise<City[]> {
  const supabase = createClient();
  const { data } = await supabase.from("cities").select("*").order("is_popular", { ascending: false });
  return data ?? [];
}

export async function listDistrictsByCity(): Promise<Record<string, District[]>> {
  const supabase = createClient();
  const { data } = await supabase.from("districts").select("*").order("name");
  const map: Record<string, District[]> = {};
  for (const d of data ?? []) {
    map[d.city_id] = map[d.city_id] ? [...map[d.city_id], d] : [d];
  }
  return map;
}

export async function listCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return data ?? [];
}

export async function listPopularDistricts(limit = 6) {
  const supabase = createClient();
  const { data } = await supabase
    .from("districts")
    .select("*, cities(slug, name)")
    .eq("is_popular", true)
    .limit(limit);
  return data ?? [];
}

// Belirli işletme satırlarını kart görünümüne dönüştürür (fiyat + açık/kapalı +
// bugünkü ilk müsait saat bilgisiyle). Tek bir RPC çağrısıyla (N+1 yok) tüm
// işletmelerin bugünkü en erken müsait saatini hesaplar.
async function toCardData(businesses: any[]): Promise<BusinessCardData[]> {
  const supabase = createClient();
  const ids = businesses.map((b) => b.id);
  if (ids.length === 0) return [];

  const [{ data: services }, { data: hours }, { data: earliestSlots }] = await Promise.all([
    supabase.from("services").select("business_id, price").in("business_id", ids).eq("is_active", true),
    supabase.from("business_hours").select("business_id, weekday, is_closed, opens_at, closes_at").in("business_id", ids),
    supabase.rpc("get_earliest_slot_today", { p_business_ids: ids }),
  ]);

  const minPriceByBusiness: Record<string, number> = {};
  for (const s of services ?? []) {
    if (minPriceByBusiness[s.business_id] == null || s.price < minPriceByBusiness[s.business_id]) {
      minPriceByBusiness[s.business_id] = s.price;
    }
  }

  const hoursByBusiness: Record<string, any[]> = {};
  for (const h of hours ?? []) {
    hoursByBusiness[h.business_id] = hoursByBusiness[h.business_id]
      ? [...hoursByBusiness[h.business_id], h]
      : [h];
  }

  const earliestByBusiness: Record<string, string> = {};
  for (const row of (earliestSlots as any[]) ?? []) {
    earliestByBusiness[row.business_id] = row.earliest_slot;
  }

  return businesses.map((b) => ({
    slug: b.slug,
    name: b.name,
    logo_url: b.logo_url,
    cover_url: b.cover_url,
    rating_avg: b.rating_avg,
    rating_count: b.rating_count,
    district_name: b.districts?.name ?? "",
    address: b.address,
    business_type: b.business_type,
    is_verified: b.is_verified,
    starting_price: minPriceByBusiness[b.id] ?? null,
    first_slot_today: earliestByBusiness[b.id] ?? null,
    is_open_now: isOpenNow(hoursByBusiness[b.id] ?? []),
    latitude: b.latitude ?? null,
    longitude: b.longitude ?? null,
  }));
}

// Haversine formülü ile iki koordinat arası km cinsinden mesafe.
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listFeaturedBusinesses(limit = 12): Promise<BusinessCardData[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*, districts(name)")
    .eq("status", "active")
    .order("is_verified", { ascending: false })
    .order("rating_avg", { ascending: false })
    .limit(limit * 2); // filtrelemeden sonra yeterli sayı kalsın diye geniş çek

  const cards = await toCardData(data ?? []);
  // "Bugün randevu alınabilen işletmeler" başlığı gerçek bir vaat — sadece
  // bugün en az bir müsait slotu olan işletmeler gösterilir.
  return cards.filter((c) => c.first_slot_today !== null).slice(0, limit);
}

export async function listBusinessesByDistrictAndCategory(params: {
  citySlug: string;
  districtSlug: string;
  categorySlug: string;
  sort?: "onerilen" | "en_yakin" | "en_erken" | "en_yuksek_puan" | "en_dusuk_fiyat";
  onlyToday?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNowOnly?: boolean;
  userLat?: number;
  userLng?: number;
}): Promise<{ businesses: BusinessCardData[]; districtName: string; cityName: string; categoryName: string } | null> {
  const supabase = createClient();

  const { data: district } = await supabase
    .from("districts")
    .select("*, cities!inner(name, slug)")
    .eq("slug", params.districtSlug)
    .eq("cities.slug", params.citySlug)
    .maybeSingle();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", params.categorySlug)
    .maybeSingle();

  if (!district || !category) return null;

  const { data } = await supabase
    .from("businesses")
    .select("*, districts(name)")
    .eq("status", "active")
    .eq("district_id", district.id)
    .eq("category_id", category.id);

  let cards = await toCardData(data ?? []);

  // --- FİLTRELER (gerçek veriye göre) ---
  if (params.onlyToday) cards = cards.filter((c) => c.first_slot_today !== null);
  if (params.minPrice != null) cards = cards.filter((c) => (c.starting_price ?? Infinity) >= params.minPrice!);
  if (params.maxPrice != null) cards = cards.filter((c) => (c.starting_price ?? 0) <= params.maxPrice!);
  if (params.minRating != null) cards = cards.filter((c) => c.rating_avg >= params.minRating!);
  if (params.openNowOnly) cards = cards.filter((c) => c.is_open_now);

  // --- SIRALAMA (gerçek veriye göre) ---
  const hasUserLocation = params.userLat != null && params.userLng != null;
  if (hasUserLocation) {
    for (const c of cards) {
      (c as any).distance_km =
        c.latitude != null && c.longitude != null
          ? distanceKm(params.userLat!, params.userLng!, c.latitude, c.longitude)
          : null;
    }
  }

  switch (params.sort) {
    case "en_yuksek_puan":
      cards.sort((a, b) => b.rating_avg - a.rating_avg);
      break;
    case "en_dusuk_fiyat":
      cards.sort((a, b) => (a.starting_price ?? Infinity) - (b.starting_price ?? Infinity));
      break;
    case "en_erken":
      cards.sort((a, b) => {
        if (a.first_slot_today == null) return 1;
        if (b.first_slot_today == null) return -1;
        return new Date(a.first_slot_today).getTime() - new Date(b.first_slot_today).getTime();
      });
      break;
    case "en_yakin":
      if (hasUserLocation) {
        cards.sort((a, b) => {
          const da = (a as any).distance_km;
          const db = (b as any).distance_km;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        });
      } else {
        // Konum paylaşılmadı: sahte mesafe üretmek yerine "Önerilen" sıralamasına
        // düşer. UI bu durumu açıkça belirtip konum izni ister (bkz. SearchBar).
        cards.sort((a, b) => Number(b.is_verified) - Number(a.is_verified) || b.rating_avg - a.rating_avg);
      }
      break;
    default:
      cards.sort((a, b) => Number(b.is_verified) - Number(a.is_verified) || b.rating_avg - a.rating_avg);
  }

  return {
    businesses: cards,
    districtName: district.name,
    cityName: (district as any).cities.name,
    categoryName: category.name,
  };
}

export async function getBusinessDetail(slug: string) {
  const supabase = createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("*, districts(name, slug, cities(name, slug)), categories(name, slug)")
    .eq("slug", slug)
    // Durum filtresi burada bilinçli olarak KALDIRILDI: RLS zaten anonim
    // kullanıcıya sadece 'active' işletmeleri gösterir (bkz. 07_hardening.sql,
    // businesses_public_read), işletme sahibi/admin ise kendi 'pending'
    // işletmesini önizleyebilmeli. Asıl erişim kontrolü veritabanı seviyesinde.
    .maybeSingle();

  if (!business) return null;

  const [{ data: services }, { data: employees }, { data: hours }, { data: photos }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("employees")
        .select("*, employee_services(service_id)")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("business_hours")
        .select("*")
        .eq("business_id", business.id)
        .order("weekday"),
      supabase.from("business_photos").select("*").eq("business_id", business.id).order("sort_order"),
      supabase
        .from("reviews")
        .select("*")
        .eq("business_id", business.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  // profil görüntülenme sayacını artır — RPC ile atomic (bkz. 07_hardening.sql:
  // eski kod doğrudan UPDATE deniyordu ve anon context'te RLS nedeniyle
  // sessizce başarısız oluyordu, sayaç hiç artmıyordu). Hata sayfayı bozmasın.
  try {
    await supabase.rpc("increment_business_view", { p_business_id: business.id });
  } catch {
    // sayaç artırılamadı — sayfa render'ını etkilemesin
  }

  return {
    business,
    services: services ?? [],
    employees: employees ?? [],
    hours: hours ?? [],
    photos: photos ?? [],
    reviews: reviews ?? [],
    isOpenNow: isOpenNow(hours ?? []),
  };
}

export async function listLastMinuteSlots(limit = 6) {
  const supabase = createClient();
  const { data } = await supabase
    .from("last_minute_slots")
    .select("*, businesses(name, slug, districts(name)), services(name)")
    .eq("is_active", true)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}
