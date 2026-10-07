"use client";

import { useState, useTransition } from "react";
import {
  createAppointmentPayment,
  markAppointmentPaymentPaid,
  refundAppointmentPayment,
} from "@/lib/business-actions";
import { formatPrice } from "@/lib/utils";

type Payment = { id: string; status: string; amount: number } | null;

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
  processing: "bg-stone-100 text-stone-600",
  paid: "bg-moss-50 text-moss-700",
  failed: "bg-red-50 text-red-600",
  canceled: "bg-stone-100 text-stone-400",
  refunded: "bg-clay-50 text-clay-600",
};

export function PaymentCell({ appointmentId, initialPayment }: { appointmentId: string; initialPayment: Payment }) {
  const [payment, setPayment] = useState(initialPayment);
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
      setPayment(result.payment);
    });
  }

  function handleMarkPaid() {
    if (!payment) return;
    setError(null);
    startTransition(async () => {
      const result = await markAppointmentPaymentPaid(payment.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayment(result.payment);
    });
  }

  function handleRefund() {
    if (!payment) return;
    if (!confirm("Bu ödemeyi iade etmek istediğinize emin misiniz?")) return;
    setError(null);
    startTransition(async () => {
      const result = await refundAppointmentPayment(payment.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPayment(result.payment);
    });
  }

  if (!payment) {
    return (
      <button
        onClick={handleCreate}
        disabled={isPending}
        className="focus-ring rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
      >
        Ödeme Oluştur
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
        {STATUS_LABELS[payment.status] ?? payment.status} · {formatPrice(payment.amount)}
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
      <div className="flex gap-1">
        {(payment.status === "pending" || payment.status === "processing") && (
          <button
            onClick={handleMarkPaid}
            disabled={isPending}
            className="focus-ring text-xs text-moss-700 hover:underline disabled:opacity-50"
          >
            Ödendi İşaretle
          </button>
        )}
        {payment.status === "paid" && (
          <button
            onClick={handleRefund}
            disabled={isPending}
            className="focus-ring text-xs text-clay-600 hover:underline disabled:opacity-50"
          >
            İade Et
          </button>
        )}
      </div>
    </div>
  );
}
