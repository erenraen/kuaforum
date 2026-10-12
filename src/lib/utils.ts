import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Server action'lardan dönen hata mesajları çoğunlukla PostgreSQL fonksiyon-
// larımızın kendi RAISE EXCEPTION metinleridir (zaten Türkçe ve kullanıcı
// dostu). Ama beklenmedik bir durumda (constraint ihlali, ağ hatası, izin
// hatası vb.) ham/teknik bir mesaj sızabilir. Bu fonksiyon böyle durumları
// tespit edip genel, anlaşılır bir mesaja çevirir — SQL/stack trace asla
// kullanıcıya gösterilmez (bkz. ürün kuralı: hata yönetimi).
const TECHNICAL_PATTERNS = [
  /relation .* does not exist/i,
  /violates .* constraint/i,
  /permission denied/i,
  /syntax error/i,
  /null value in column/i,
  /duplicate key value/i,
  /JWT/i,
  /fetch failed/i,
  /ECONNREFUSED/i,
];

export function friendlyError(message: string | undefined | null, fallback = "Bir şeyler ters gitti. Lütfen tekrar deneyin."): string {
  if (!message) return fallback;
  if (TECHNICAL_PATTERNS.some((p) => p.test(message))) return fallback;
  return message;
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

export function formatDateLong(dateStr: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(dateStr));
}

export function todayIso() {
  return istanbulTodayIso();
}

// Türkiye 2016'dan beri DST uygulamıyor (sabit UTC+3) — bu yüzden sabit ofsetle
// güvenle "İstanbul'da bugün" hesaplanabilir, ağır bir tz kütüphanesi gerekmez.
export function istanbulTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

// Verilen (veya şimdiki) anın İstanbul takvim gününün 00:00–23:59:59.999
// sınırlarını, doğru UTC instant'lar olarak döner. Sunucu tarafında "bugünkü
// randevular" gibi sorgularda kullanılır — Node process'in kendi saat dilimine
// (genelde UTC) güvenmez.
export function istanbulDayBounds(dateIso?: string): { start: Date; end: Date } {
  const day = dateIso ?? istanbulTodayIso();
  return {
    start: new Date(`${day}T00:00:00.000+03:00`),
    end: new Date(`${day}T23:59:59.999+03:00`),
  };
}

export const WEEKDAY_NAMES = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi",
];

export const BUSINESS_TYPE_LABELS: Record<string, string> = {
  erkek_beber: "Erkek Berberi",
  kadin_kuafor: "Kadın Kuaförü",
  unisex: "Unisex Salon",
  guzellik_salonu: "Güzellik Salonu",
};
