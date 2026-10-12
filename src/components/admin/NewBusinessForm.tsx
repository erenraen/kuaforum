"use client";

import { useState } from "react";
import { createBusinessByAdmin } from "@/lib/admin-actions";
import type { City, District, Category } from "@/types/database";

export function NewBusinessForm({
  cities,
  districtsByCity,
  categories,
}: {
  cities: City[];
  districtsByCity: Record<string, District[]>;
  categories: Category[];
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    businessType: "erkek_beber" as any,
    categoryId: categories[0]?.id ?? "",
    cityId: cities[0]?.id ?? "",
    districtId: "",
    address: "",
    phone: "",
    instagramHandle: "",
    ownerEmail: "",
    ownerName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tempPassword?: string } | null>(null);

  const districts = districtsByCity[form.cityId] ?? [];

  function slugify(text: string) {
    return text
      .toLocaleLowerCase("tr")
      .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await createBusinessByAdmin(form);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess({ tempPassword: result.tempPassword });
    setForm((f) => ({ ...f, name: "", slug: "", ownerEmail: "", ownerName: "" }));
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Yeni İşletme Ekle</h1>
      <p className="mt-1 max-w-lg text-sm text-stone-500">
        Instagram&apos;dan gelen bilgileri buraya girerek işletmeyi 1-2 dakikada sisteme
        ekleyebilirsiniz. İşletme sahibi için otomatik giriş hesabı da oluşturulur.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 max-w-xl space-y-4 rounded-xl2 border border-stone-200 bg-white p-5">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">İşletme Adı</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">URL (slug)</span>
          <div className="mt-1 flex items-center rounded-lg border border-stone-200 text-sm">
            <span className="pl-3 text-stone-400">/isletme/</span>
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              className="focus-ring w-full rounded-r-lg px-2 py-2.5"
            />
          </div>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">İşletme Türü</span>
            <select
              value={form.businessType}
              onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            >
              <option value="erkek_beber">Erkek Berberi</option>
              <option value="kadin_kuafor">Kadın Kuaförü</option>
              <option value="unisex">Unisex Salon</option>
              <option value="guzellik_salonu">Güzellik Salonu</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Kategori</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">İl</span>
            <select
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value, districtId: "" })}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            >
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">İlçe</span>
            <select
              required
              value={form.districtId}
              onChange={(e) => setForm({ ...form, districtId: e.target.value })}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            >
              <option value="">Seçin</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-stone-500">Adres</span>
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Telefon</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Instagram</span>
            <input value={form.instagramHandle} onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
          </label>
        </div>

        <div className="border-t border-stone-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">İşletme Sahibi</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-stone-500">Ad Soyad</span>
              <input required value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-500">E-posta</span>
              <input required type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
            </label>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {success && (
          <div className="rounded-lg bg-moss-50 px-3 py-2.5 text-sm text-moss-700">
            <p>İşletme başarıyla eklendi.</p>
            {success.tempPassword && (
              <p className="mt-1">
                Geçici şifre: <code className="rounded bg-white px-1.5 py-0.5">{success.tempPassword}</code>{" "}
                (işletme sahibine iletin, ilk girişte değiştirebilir)
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {loading ? "Ekleniyor…" : "İşletmeyi Ekle"}
        </button>
      </form>
    </div>
  );
}
