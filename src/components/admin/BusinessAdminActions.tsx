"use client";

import { useTransition } from "react";
import { setBusinessStatus, toggleBusinessVerification } from "@/lib/admin-actions";

export function BusinessAdminActions({
  businessId,
  status,
  isVerified,
}: {
  businessId: string;
  status: string;
  isVerified: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<any>) {
    startTransition(() => fn());
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" && (
        <button
          disabled={isPending}
          onClick={() => run(() => setBusinessStatus(businessId, "active"))}
          className="focus-ring rounded-md bg-moss-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-moss-700 disabled:opacity-50"
        >
          Onayla
        </button>
      )}
      {status !== "rejected" && (
        <button
          disabled={isPending}
          onClick={() => run(() => setBusinessStatus(businessId, "rejected"))}
          className="focus-ring rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Reddet
        </button>
      )}
      {status === "active" && (
        <button
          disabled={isPending}
          onClick={() => run(() => setBusinessStatus(businessId, "suspended"))}
          className="focus-ring rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Askıya Al
        </button>
      )}
      {status === "suspended" && (
        <button
          disabled={isPending}
          onClick={() => run(() => setBusinessStatus(businessId, "active"))}
          className="focus-ring rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
        >
          Askıyı Kaldır
        </button>
      )}
      <button
        disabled={isPending}
        onClick={() => run(() => toggleBusinessVerification(businessId, !isVerified))}
        className={`focus-ring rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
          isVerified ? "border border-stone-200 text-stone-600 hover:bg-stone-50" : "bg-ink text-white hover:bg-moss-700"
        }`}
      >
        {isVerified ? "Doğrulamayı Kaldır" : "Doğrula"}
      </button>
    </div>
  );
}
