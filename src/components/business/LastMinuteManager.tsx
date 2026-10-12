"use client";

import { useState, useTransition } from "react";
import { createLastMinuteSlot, deactivateLastMinuteSlot } from "@/lib/business-actions";
import { formatTime } from "@/lib/utils";
import type { Employee, Service } from "@/types/database";

export function LastMinuteManager({
  employees,
  services,
  initialSlots,
}: {
  employees: Employee[];
  services: Service[];
  initialSlots: any[];
}) {
  const [slots, setSlots] = useState(initialSlots);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedService = services.find((s) => s.id === serviceId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!time || !selectedService) return;
    setError(null);

    // İstanbul'un bugünkü tarihi — tarayıcı yerel saatine değil, sabit
    // Europe/Istanbul (UTC+3) ofsetine göre hesaplanır.
    const istanbulToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
    const startsAt = new Date(`${istanbulToday}T${time}:00+03:00`);

    startTransition(async () => {
      const result = await createLastMinuteSlot({
        employeeId,
        serviceId,
        startsAt: startsAt.toISOString(),
        durationMinutes: selectedService.duration_minutes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  function handleRemove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deactivateLastMinuteSlot(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSlots((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Son Dakika Boşluğu</h1>
      <p className="mt-1 max-w-lg text-sm text-stone-500">
        Bir müşteri iptal ettiğinde veya boş bir saatiniz olduğunda burada işaretleyin;
        ana sayfada &quot;🔥 Son Dakika&quot; bölümünde öne çıkarılır.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl2 border border-stone-200 bg-white p-4">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Çalışan</span>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="focus-ring mt-1 rounded-lg border border-stone-200 px-3 py-2 text-sm">
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Hizmet</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="focus-ring mt-1 rounded-lg border border-stone-200 px-3 py-2 text-sm">
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Saat</span>
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="focus-ring mt-1 rounded-lg border border-stone-200 px-3 py-2 text-sm" />
        </label>
        <button type="submit" disabled={isPending} className="focus-ring rounded-lg bg-clay-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-clay-600 disabled:opacity-60">
          🔥 Son Dakika Olarak Yayınla
        </button>
      </form>

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-2">
        {slots.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl2 border border-clay-100 bg-clay-50/50 px-4 py-3">
            <div className="text-sm">
              <span className="font-medium text-ink">{formatTime(s.starts_at)}</span>
              <span className="ml-2 text-stone-500">{s.services?.name}</span>
            </div>
            <button onClick={() => handleRemove(s.id)} className="focus-ring text-sm text-stone-500 hover:text-red-600">Kaldır</button>
          </div>
        ))}
        {slots.length === 0 && <p className="text-sm text-stone-500">Aktif son dakika ilanınız yok.</p>}
      </div>
    </div>
  );
}
