"use client";

import { useState, useTransition } from "react";
import {
  createAppointmentPayment,
  markAppointmentPaymentPaid,
  markAppointmentPaymentFailed,
  refundAppointmentPayment,
} from "@/lib/business-actions";
import { formatPrice } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  paid: "Ödendi",
  failed: "Başarısız",
  canceled: "İptal",
  refunded: "İade edildi",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-stone-100 text-stone-600",
  processing: "bg-clay-50 text-clay-600",
  paid: "bg-moss-50 text-moss-700",
  failed: "bg-red-50 text-red-600",
  canceled: "bg-stone-100 text-stone-400",
  refunded: "bg-stone-100 text-stone-500",
};

export function PaymentActions({
  appointmentId,
  payment,
}: {
  appointmentId: string;
  payment: { id: string; status: string; amount: number } | null;
}) {
  const [current, setCurrent] = useState(payment);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createAppointmentPayment(appointmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent(result.payment);
    });
  }

  function handleMarkPaid() {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await markAppointmentPaymentPaid(current.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent(result.payment);
    });
  }

  function handleMarkFailed() {
    if (!current) return;
    setError(null);
    startTransition(async () => {
      const result = await markAppointmentPaymentFailed(current.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent({ ...current, status: "failed" });
    });
  }

  function handleRefund() {
    if (!current) return;
    if (!confirm("Bu ödemeyi iade etmek istediğinize emin misiniz?")) return;
    setError(null);
    startTransition(async () => {
      const result = await refundAppointmentPayment(current.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCurrent(result.payment);
    });
  }

  if (!current) {
    return (
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="focus-ring rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
      >
        {isPending ? "…" : "Ödeme Oluştur"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[current.status] ?? ""}`}>
          {STATUS_LABELS[current.status] ?? current.status}
        </span>
        <span className="text-xs text-stone-400">{formatPrice(current.amount)}</span>
      </div>
      <div className="flex gap-1">
        {(current.status === "pending" || current.status === "processing") && (
          <>
            <button onClick={handleMarkPaid} disabled={isPending} className="focus-ring rounded-md bg-moss-600 px-2 py-0.5 text-xs text-white hover:bg-moss-700 disabled:opacity-50">
              Ödendi İşaretle
            </button>
            <button onClick={handleMarkFailed} disabled={isPending} className="focus-ring rounded-md border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
              Başarısız
            </button>
          </>
        )}
        {current.status === "paid" && (
          <button onClick={handleRefund} disabled={isPending} className="focus-ring rounded-md border border-stone-200 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50">
            İade Et
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
