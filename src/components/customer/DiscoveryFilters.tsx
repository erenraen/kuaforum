"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "onerilen", label: "Önerilen" },
  { value: "en_yakin", label: "En yakın" },
  { value: "en_erken", label: "En erken randevu" },
  { value: "en_yuksek_puan", label: "En yüksek puan" },
  { value: "en_dusuk_fiyat", label: "En düşük fiyat" },
];

export function DiscoveryFilters({ hasUserLocation }: { hasUserLocation: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const sort = searchParams.get("sirala") ?? "onerilen";
  const onlyToday = searchParams.get("bugun") === "1";
  const openNow = searchParams.get("acik") === "1";
  const minPrice = searchParams.get("fiyatMin") ?? "";
  const maxPrice = searchParams.get("fiyatMax") ?? "";
  const minRating = searchParams.get("puan") ?? "";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("Tarayıcınız konum paylaşımını desteklemiyor.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const params = new URLSearchParams(searchParams.toString());
        params.set("lat", String(pos.coords.latitude));
        params.set("lng", String(pos.coords.longitude));
        params.set("sirala", "en_yakin");
        router.push(`${pathname}?${params.toString()}`);
      },
      () => {
        setLocating(false);
        setLocationError("Konum izni verilmedi. Mesafeye göre sıralama için konum paylaşman gerekiyor.");
      }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              if (opt.value === "en_yakin" && !hasUserLocation) {
                requestLocation();
                return;
              }
              setParam("sirala", opt.value);
            }}
            className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              sort === opt.value
                ? "border-ink bg-ink text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {opt.label === "En yakın" && locating ? "Konum alınıyor…" : opt.label}
          </button>
        ))}
      </div>

      {sort === "en_yakin" && !hasUserLocation && (
        <p className="text-xs text-clay-600">
          {locationError ?? "Mesafeye göre sıralamak için konumunu paylaşman gerekiyor; o güne kadar \"Önerilen\" sırası gösteriliyor."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-stone-200 bg-white p-3 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={onlyToday}
            onChange={(e) => setParam("bugun", e.target.checked ? "1" : null)}
            className="focus-ring h-4 w-4 rounded border-stone-300 text-moss-600"
          />
          Bugün müsait
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={openNow}
            onChange={(e) => setParam("acik", e.target.checked ? "1" : null)}
            className="focus-ring h-4 w-4 rounded border-stone-300 text-moss-600"
          />
          Şu an açık
        </label>

        <div className="flex items-center gap-1.5">
          <span className="text-stone-400">Fiyat</span>
          <input
            type="number"
            placeholder="Min"
            defaultValue={minPrice}
            onBlur={(e) => setParam("fiyatMin", e.target.value)}
            className="focus-ring w-20 rounded-lg border border-stone-200 px-2 py-1"
          />
          <span className="text-stone-300">–</span>
          <input
            type="number"
            placeholder="Max"
            defaultValue={maxPrice}
            onBlur={(e) => setParam("fiyatMax", e.target.value)}
            className="focus-ring w-20 rounded-lg border border-stone-200 px-2 py-1"
          />
        </div>

        <label className="flex items-center gap-1.5">
          <span className="text-stone-400">Min. puan</span>
          <select
            value={minRating}
            onChange={(e) => setParam("puan", e.target.value || null)}
            className="focus-ring rounded-lg border border-stone-200 px-2 py-1"
          >
            <option value="">Hepsi</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="4.5">4.5+</option>
          </select>
        </label>

        {(onlyToday || openNow || minPrice || maxPrice || minRating || sort !== "onerilen") && (
          <button onClick={() => router.push(pathname)} className="focus-ring text-stone-400 hover:text-ink">
            Filtreleri temizle
          </button>
        )}
      </div>
    </div>
  );
}
