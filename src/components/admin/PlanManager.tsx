"use client";

import { useState, useTransition } from "react";
import { updatePlanPrice, togglePlanActive } from "@/lib/admin-actions";
import { formatPrice } from "@/lib/utils";
import type { Plan } from "@/types/database";

export function PlanManager({ initialPlans }: { initialPlans: (Plan & { id: string })[] }) {
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(initialPlans.map((p) => [p.id, String(p.price)]))
  );
  const [isPending, startTransition] = useTransition();

  function save(planId: string) {
    const price = Number(prices[planId]);
    if (!price || price <= 0) return;
    startTransition(() => {
      updatePlanPrice(planId, price);
    });
  }

  function toggle(planId: string, active: boolean) {
    startTransition(async () => {
      await togglePlanActive(planId, active);
      window.location.reload();
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Paketler</h1>
      <p className="mt-1 text-sm text-stone-500">
        İşletme paketlerinin fiyatlarını buradan güncelleyebilirsiniz. İlk MVP&apos;de ödeme
        entegrasyonu mock&apos;tır.
      </p>

      <div className="mt-5 space-y-3">
        {initialPlans.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-stone-200 bg-white p-4">
            <div>
              <p className="font-medium text-ink">{p.name} {!p.is_active && <span className="ml-1 text-xs text-stone-400">(pasif)</span>}</p>
              <p className="text-sm text-stone-500">{p.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={prices[p.id]}
                onChange={(e) => setPrices({ ...prices, [p.id]: e.target.value })}
                className="focus-ring w-28 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              />
              <button onClick={() => save(p.id)} disabled={isPending} className="focus-ring rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
                Kaydet
              </button>
              <button onClick={() => toggle(p.id, !p.is_active)} disabled={isPending} className="focus-ring rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 disabled:opacity-60">
                {p.is_active ? "Pasifleştir" : "Aktifleştir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
