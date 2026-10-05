"use client";

import { useState, useTransition } from "react";
import { createManualAppointment } from "@/lib/business-actions";
import type { Employee, Service } from "@/types/database";

export function ManualBookingModal({
  employeeId,
  date,
  time,
  services,
  employees,
  onClose,
}: {
  employeeId: string;
  date: string;
  time: string;
  services: Service[];
  employees: Employee[];
  onClose: () => void;
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createManualAppointment({
        employeeId: selectedEmployeeId,
        serviceId,
        startsAt: new Date(`${date}T${time}:00+03:00`).toISOString(),
        customerName: name,
        customerPhone: phone,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-t-xl2 bg-white p-5 sm:rounded-xl2">
        <h2 className="font-display text-lg text-ink">Manuel Randevu — {time}</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Çalışan</span>
            <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Hizmet</span>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm">
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} dk)</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Müşteri Adı</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Telefon</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm" />
          </label>
        </div>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="focus-ring flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600">Vazgeç</button>
          <button type="submit" disabled={isPending} className="focus-ring flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
            {isPending ? "Oluşturuluyor…" : "Randevu Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
