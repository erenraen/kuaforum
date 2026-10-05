"use client";

import { useState, useTransition } from "react";
import { addCity, addDistrict } from "@/lib/admin-actions";
import type { City, District } from "@/types/database";

export function CityDistrictManager({
  initialCities,
  districtsByCity,
}: {
  initialCities: City[];
  districtsByCity: Record<string, District[]>;
}) {
  const [cityName, setCityName] = useState("");
  const [districtCityId, setDistrictCityId] = useState(initialCities[0]?.id ?? "");
  const [districtName, setDistrictName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    if (!cityName.trim()) return;
    startTransition(async () => {
      await addCity(cityName.trim());
      window.location.reload();
    });
  }

  function handleAddDistrict(e: React.FormEvent) {
    e.preventDefault();
    if (!districtName.trim() || !districtCityId) return;
    startTransition(async () => {
      await addDistrict(districtCityId, districtName.trim());
      window.location.reload();
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Şehirler / İlçeler</h1>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={handleAddCity} className="rounded-xl2 border border-stone-200 bg-white p-4">
          <h2 className="font-medium text-ink">Yeni İl Ekle</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              placeholder="İl adı"
              className="focus-ring flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <button disabled={isPending} className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
              Ekle
            </button>
          </div>
        </form>

        <form onSubmit={handleAddDistrict} className="rounded-xl2 border border-stone-200 bg-white p-4">
          <h2 className="font-medium text-ink">Yeni İlçe Ekle</h2>
          <div className="mt-3 flex gap-2">
            <select
              value={districtCityId}
              onChange={(e) => setDistrictCityId(e.target.value)}
              className="focus-ring rounded-lg border border-stone-200 px-3 py-2 text-sm"
            >
              {initialCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              placeholder="İlçe adı"
              className="focus-ring flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <button disabled={isPending} className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
              Ekle
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 space-y-6">
        {initialCities.map((city) => (
          <div key={city.id}>
            <h3 className="font-display text-lg text-ink">{city.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {(districtsByCity[city.id] ?? []).map((d) => (
                <span key={d.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                  {d.name}
                </span>
              ))}
              {(districtsByCity[city.id] ?? []).length === 0 && (
                <span className="text-sm text-stone-400">Henüz ilçe eklenmedi.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
