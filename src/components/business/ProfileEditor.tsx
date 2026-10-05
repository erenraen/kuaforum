"use client";

import { useState, useTransition } from "react";
import { updateBusinessProfile, updateBusinessImage } from "@/lib/business-actions";
import { ImageUploader } from "@/components/business/ImageUploader";
import type { Business } from "@/types/database";

export function ProfileEditor({ business }: { business: Business }) {
  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? "",
    phone: business.phone ?? "",
    instagram_handle: business.instagram_handle ?? "",
    address: business.address ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateBusinessProfile(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">İşletme Profili</h1>
      <p className="mt-1 text-sm text-stone-500">
        Bu bilgiler müşterilerinizin gördüğü profil sayfasında görünür.
      </p>

      <div className="mt-5 max-w-xl space-y-4 rounded-xl2 border border-stone-200 bg-white p-5">
        <ImageUploader
          businessId={business.id}
          filePath="logo"
          currentUrl={business.logo_url}
          label="Logo"
          shape="circle"
          onUploaded={(url) => updateBusinessImage("logo_url", url)}
        />
        <ImageUploader
          businessId={business.id}
          filePath="cover"
          currentUrl={business.cover_url}
          label="Kapak Fotoğrafı"
          shape="wide"
          onUploaded={(url) => updateBusinessImage("cover_url", url)}
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 max-w-xl space-y-4 rounded-xl2 border border-stone-200 bg-white p-5">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">İşletme Adı</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Açıklama</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Telefon</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Instagram (kullanıcı adı)</span>
            <input
              value={form.instagram_handle}
              onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
              placeholder="ornek_isletme"
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Adres</span>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
          />
        </label>

        <p className="text-xs text-stone-400">
          İl / ilçe değişikliği ve logo / kapak fotoğrafı yüklemesi için Supabase Storage
          entegrasyonu üzerinden admin ile iletişime geçin (bu MVP&apos;de basitleştirilmiştir).
        </p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="focus-ring rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
          >
            {isPending ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {saved && <span className="text-sm text-moss-600">Kaydedildi.</span>}
        </div>
      </form>
    </div>
  );
}
