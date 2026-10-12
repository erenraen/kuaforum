"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { City, District, Category } from "@/types/database";

export function SearchBar({
  cities,
  districtsByCity,
  categories,
}: {
  cities: City[];
  districtsByCity: Record<string, District[]>;
  categories: Category[];
}) {
  const router = useRouter();
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [districtSlug, setDistrictSlug] = useState("");
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "");
  const [onlyToday, setOnlyToday] = useState(false);

  const districts = districtsByCity[cityId] ?? [];
  const citySlug = cities.find((c) => c.id === cityId)?.slug ?? "";

  function goToDiscovery(e: React.FormEvent) {
    e.preventDefault();
    if (!citySlug || !districtSlug || !categorySlug) return;
    const params = new URLSearchParams();
    if (onlyToday) params.set("bugun", "1");
    router.push(`/${citySlug}/${districtSlug}/${categorySlug}${params.size ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={goToDiscovery}
      className="grid grid-cols-1 gap-3 rounded-xl2 bg-white p-4 shadow-[0_20px_50px_-20px_rgba(28,28,30,0.25)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">İl</span>
        <select
          value={cityId}
          onChange={(e) => {
            setCityId(e.target.value);
            setDistrictSlug("");
          }}
          className="focus-ring rounded-lg border border-stone-200 bg-paper px-3 py-2.5 text-sm"
        >
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">İlçe</span>
        <select
          value={districtSlug}
          onChange={(e) => setDistrictSlug(e.target.value)}
          className="focus-ring rounded-lg border border-stone-200 bg-paper px-3 py-2.5 text-sm"
        >
          <option value="">İlçe seçin</option>
          {districts.map((d) => (
            <option key={d.id} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-stone-500">Hizmet</span>
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="focus-ring rounded-lg border border-stone-200 bg-paper px-3 py-2.5 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          className="focus-ring w-full rounded-lg bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-moss-700 lg:w-auto"
        >
          Kuaför Bul
        </button>
      </div>

      <label className="col-span-full flex items-center gap-2 pt-1 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={onlyToday}
          onChange={(e) => setOnlyToday(e.target.checked)}
          className="focus-ring h-4 w-4 rounded border-stone-300 text-moss-600"
        />
        Bugün müsait olanları göster
      </label>
    </form>
  );
}
