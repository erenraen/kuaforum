"use client";

import { useState, useTransition } from "react";
import { upsertEmployee, deleteEmployee, updateEmployeePhoto } from "@/lib/business-actions";
import { ImageUploader } from "@/components/business/ImageUploader";
import type { Employee, Service } from "@/types/database";

type EmployeeWithServices = Employee & { employee_services: { service_id: string }[] };

const emptyForm = { id: undefined as string | undefined, full_name: "", title: "", is_active: true, serviceIds: [] as string[] };

export function EmployeeManager({
  businessId,
  initialEmployees,
  services,
}: {
  businessId: string;
  initialEmployees: EmployeeWithServices[];
  services: Service[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm(emptyForm);
    setIsOpen(true);
    setError(null);
  }

  function openEdit(e: EmployeeWithServices) {
    setForm({
      id: e.id,
      full_name: e.full_name,
      title: e.title ?? "",
      is_active: e.is_active,
      serviceIds: e.employee_services.map((es) => es.service_id),
    });
    setIsOpen(true);
    setError(null);
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await upsertEmployee(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsOpen(false);
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Bu çalışanı silmek istediğinize emin misiniz?")) return;
    setListError(null);
    startTransition(async () => {
      const result = await deleteEmployee(id);
      if (!result.ok) {
        setListError(result.error);
        return;
      }
      setEmployees((prev) => prev.filter((e) => e.id !== id));
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Çalışanlar</h1>
        <button onClick={openNew} className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700">
          + Yeni Çalışan
        </button>
      </div>

      {listError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{listError}</p>}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <div key={e.id} className="rounded-xl2 border border-stone-200 bg-white p-4">
            <p className="font-medium text-ink">{e.full_name} {!e.is_active && <span className="ml-1 text-xs text-stone-400">(pasif)</span>}</p>
            {e.title && <p className="text-sm text-stone-500">{e.title}</p>}
            <p className="mt-1 text-xs text-stone-400">
              {e.employee_services.length} hizmet veriyor
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(e)} className="focus-ring text-sm text-stone-600 hover:text-ink">Düzenle</button>
              <button onClick={() => handleDelete(e.id)} className="focus-ring text-sm text-red-500 hover:text-red-700">Sil</button>
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <p className="col-span-full py-8 text-center text-stone-500">Henüz çalışan eklenmedi.</p>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4">
          <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl2 bg-white p-5 sm:rounded-xl2">
            <h2 className="font-display text-lg text-ink">{form.id ? "Çalışanı Düzenle" : "Yeni Çalışan"}</h2>
            <div className="mt-4 space-y-3">
              {form.id && (
                <ImageUploader
                  businessId={businessId}
                  filePath={`employees/${form.id}`}
                  currentUrl={employees.find((e) => e.id === form.id)?.photo_url}
                  label="Fotoğraf"
                  shape="circle"
                  onUploaded={(url) => updateEmployeePhoto(form.id!, url)}
                />
              )}
              <label className="block">
                <span className="text-xs font-medium text-stone-500">Ad Soyad</span>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-stone-500">Unvan (isteğe bağlı)</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Kuaför, Berber, Nail Art Uzmanı…"
                  className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
                />
              </label>

              <div>
                <span className="text-xs font-medium text-stone-500">Verebileceği hizmetler</span>
                <div className="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-stone-200 p-2">
                  {services.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-stone-600">
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="focus-ring h-4 w-4 rounded border-stone-300"
                      />
                      {s.name}
                    </label>
                  ))}
                  {services.length === 0 && <p className="text-xs text-stone-400">Önce hizmet ekleyin.</p>}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="focus-ring h-4 w-4 rounded border-stone-300"
                />
                Aktif
              </label>
            </div>

            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="focus-ring flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600">
                Vazgeç
              </button>
              <button type="submit" disabled={isPending} className="focus-ring flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
                {isPending ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
