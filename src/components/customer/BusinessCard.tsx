import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatTime, BUSINESS_TYPE_LABELS } from "@/lib/utils";

export interface BusinessCardData {
  slug: string;
  name: string;
  logo_url: string | null;
  cover_url: string | null;
  rating_avg: number;
  rating_count: number;
  district_name: string;
  address: string | null;
  business_type: string;
  is_verified: boolean;
  starting_price: number | null;
  first_slot_today: string | null;
  is_open_now: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
}

export function BusinessCard({ b }: { b: BusinessCardData }) {
  return (
    <Link
      href={`/isletme/${b.slug}`}
      className="focus-ring group flex flex-col overflow-hidden rounded-xl2 border border-stone-200 bg-white transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(28,28,30,0.18)]"
    >
      <div className="relative h-36 w-full overflow-hidden bg-stone-100">
        {b.cover_url ? (
          <Image
            src={b.cover_url}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <span className="font-display text-3xl italic">{b.name.slice(0, 1)}</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
            b.is_open_now ? "bg-moss-600 text-white" : "bg-stone-800/80 text-white"
          }`}
        >
          {b.is_open_now ? "Şu an açık" : "Kapalı"}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg leading-snug text-ink">{b.name}</h3>
          {b.is_verified && (
            <span
              title="Doğrulanmış işletme"
              className="mt-1 shrink-0 rounded-full bg-moss-50 px-2 py-0.5 text-[11px] font-medium text-moss-700"
            >
              Doğrulanmış
            </span>
          )}
        </div>

        <p className="text-sm text-stone-500">
          {BUSINESS_TYPE_LABELS[b.business_type]} · {b.district_name}
          {b.distance_km != null && <> · {b.distance_km < 1 ? `${Math.round(b.distance_km * 1000)} m` : `${b.distance_km.toFixed(1)} km`}</>}
        </p>

        <div className="flex items-center gap-1 text-sm text-stone-600">
          <span className="font-medium text-ink">{b.rating_avg > 0 ? b.rating_avg.toFixed(1) : "Yeni"}</span>
          {b.rating_count > 0 && <span className="text-stone-400">({b.rating_count} değerlendirme)</span>}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <div>
            {b.starting_price != null && (
              <span className="text-stone-500">
                {formatPrice(b.starting_price)}&apos;den başlayan
              </span>
            )}
          </div>
          {b.first_slot_today && (
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
              Bugün {formatTime(b.first_slot_today)}
            </span>
          )}
        </div>

        <span className="focus-ring mt-1 inline-flex items-center justify-center rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors group-hover:bg-moss-700">
          Randevu Al
        </span>
      </div>
    </Link>
  );
}
