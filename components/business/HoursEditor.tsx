"use client";

import { useState, useTransition } from "react";
import { updateBusinessHours } from "@/lib/business-actions";
import { WEEKDAY_NAMES } from "@/lib/utils";
import type { BusinessHours } from "@/types/database";

type Row = { weekday: number; is_closed: boolean; opens_at: string | null; closes_at: string | null };

export function HoursEditor({ initialHours }: { initialHours: BusinessHours[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: 7 }, (_, weekday) => {
      const existing = initialHours.find((h) => h.weekday === weekday);
      return {
        weekday,
        is_closed: existing?.is_closed ?? weekday === 0,
        opens_at: existing?.opens_at?.slice(0, 5) ?? "09:00",
        closes_at: existing?.closes_at?.slice(0, 5) ?? "20:00",
      };
    })
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function update(weekday: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBusinessHours(rows);
      if (result.ok) setSaved(true);
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Çalışma Saatleri</h1>
      <p className="mt-1 text-sm text-stone-500">
        Randevu sistemi bu saatlere göre otomatik olarak müsait slotlar oluşturur.
      </p>

      <div className="mt-5 divide-y divide-stone-200 rounded-xl2 border border-stone-200 bg-white">
        {rows.map((r) => (
          <div key={r.weekday} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <span className="w-24 text-sm font-medium text-ink">{WEEKDAY_NAMES[r.weekday]}</span>
            <label className="flex items-center gap-1.5 text-sm text-stone-500">
              <input
                type="checkbox"
                checked={r.is_closed}
                onChange={(e) => update(r.weekday, { is_closed: e.target.checked })}
                className="focus-ring h-4 w-4 rounded border-stone-300"
              />
              Kapalı
            </label>
            {!r.is_closed && (
              <>
                <input
                  type="time"
                  value={r.opens_at ?? ""}
                  onChange={(e) => update(r.weekday, { opens_at: e.target.value })}
                  className="focus-ring rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm"
                />
                <span className="text-stone-400">–</span>
                <input
                  type="time"
                  value={r.closes_at ?? ""}
                  onChange={(e) => update(r.weekday, { closes_at: e.target.value })}
                  className="focus-ring rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm"
                />
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="focus-ring rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor…" : "Kaydet"}
        </button>
        {saved && <span className="text-sm text-moss-600">Kaydedildi.</span>}
      </div>
    </div>
  );
}
