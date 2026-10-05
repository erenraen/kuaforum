"use client";

import { useState, useTransition } from "react";
import { upsertService, deleteService } from "@/lib/business-actions";
import { formatPrice } from "@/lib/utils";
import type { Service } from "@/types/database";

const emptyForm = { id: undefined as string | undefined, name: "", description: "", price: "", duration_minutes: "30", is_active: true };

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm(emptyForm);
    setIsOpen(true);
    setError(null);
  }

  function openEdit(s: Service) {
    setForm({
      id: s.id,
      name: s.name,
      description: s.description ?? "",
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      is_active: s.is_active,
    });
    setIsOpen(true);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertService(form as any);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Bu hizmeti silmek istediğinize emin misiniz?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteService(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setServices((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Hizmetler</h1>
        <button
          onClick={openNew}
          className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700"
        >
          + Yeni Hizmet
        </button>
      </div>

      {error && !isOpen && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-5 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
        {services.length === 0 && (
          <p className="px-4 py-8 text-center text-stone-500">Henüz hizmet eklenmedi.</p>
        )}
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="font-medium text-ink">{s.name} {!s.is_active && <span className="ml-2 text-xs text-stone-400">(pasif)</span>}</p>
              <p className="text-sm text-stone-500">{formatPrice(s.price)} · {s.duration_minutes} dk</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="focus-ring text-sm text-stone-600 hover:text-ink">Düzenle</button>
              <button onClick={() => handleDelete(s.id)} className="focus-ring text-sm text-red-500 hover:text-red-700">Sil</button>
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-t-xl2 bg-white p-5 sm:rounded-xl2"
          >
            <h2 className="font-display text-lg text-ink">{form.id ? "Hizmeti Düzenle" : "Yeni Hizmet"}</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-stone-500">Hizmet Adı</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                  placeholder="Saç Kesimi"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500">Açıklama (isteğe bağlı)</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-stone-500">Fiyat (₺)</span>
                  <input
                    required
                    type="number"
                    min={1}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-stone-500">Süre (dk)</span>
                  <select
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                  >
                    {[15, 20, 30, 40, 45, 50, 60, 75, 90, 120].map((m) => (
                      <option key={m} value={m}>{m} dk</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="focus-ring h-4 w-4 rounded border-stone-300"
                />
                Aktif (müşterilere gösterilsin)
              </label>
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="focus-ring flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
              >
                {isPending ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
