"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "@/lib/business-actions";

export function AppointmentActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function set(next: "confirmed" | "completed" | "canceled" | "no_show"): void {
    startTransition(() => {
      updateAppointmentStatus(id, next);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" && (
        <button
          onClick={() => set("confirmed")}
          disabled={isPending}
          className="focus-ring rounded-md bg-moss-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-moss-700 disabled:opacity-50"
        >
          Onayla
        </button>
      )}
      {(status === "pending" || status === "confirmed") && (
        <>
          <button
            onClick={() => set("completed")}
            disabled={isPending}
            className="focus-ring rounded-md bg-stone-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink disabled:opacity-50"
          >
            Tamamlandı
          </button>
          <button
            onClick={() => set("canceled")}
            disabled={isPending}
            className="focus-ring rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            İptal Et
          </button>
          <button
            onClick={() => set("no_show")}
            disabled={isPending}
            className="focus-ring rounded-md border border-clay-200 px-2.5 py-1 text-xs font-medium text-clay-600 hover:bg-clay-50 disabled:opacity-50"
          >
            Gelmedi
          </button>
        </>
      )}
    </div>
  );
}
