"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { tr } from "date-fns/locale";
import {
  getAppointmentSummary,
  cancelMyAppointment,
  rescheduleMyAppointment,
  generateCheckinToken,
  getAppointmentNotifications,
  getPaymentStatusForAppointment,
  type AppointmentSummary,
  type NotificationItem,
  type PaymentStatusItem,
} from "@/lib/booking/actions";
import { formatPrice, formatTime } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  completed: "Tamamlandı",
  canceled: "İptal edildi",
  no_show: "Gelinmedi",
};

export function AppointmentHub({ appointmentId }: { appointmentId: string }) {
  const [phone, setPhone] = useState("");
  const [appt, setAppt] = useState<AppointmentSummary | null>(null);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setNotFoundError(null);
    startTransition(async () => {
      const result = await getAppointmentSummary(appointmentId, phone);
      if (!result) {
        setNotFoundError("Randevu bulunamadı veya telefon numarası eşleşmiyor.");
        return;
      }
      setAppt(result);
    });
  }

  if (!appt) {
    return (
      <form onSubmit={handleLookup} className="rounded-xl2 border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-600">
          Randevunu görüntülemek için randevu alırken kullandığın telefon numarasını gir.
        </p>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="05XX XXX XX XX"
          className="focus-ring mt-3 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
        {notFoundError && <p className="mt-2 text-sm text-red-600">{notFoundError}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring mt-3 w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {isPending ? "Aranıyor…" : "Randevumu Göster"}
        </button>
      </form>
    );
  }

  return <AppointmentDetail appt={appt} phone={phone} onUpdated={setAppt} />;
}

function AppointmentDetail({
  appt,
  phone,
  onUpdated,
}: {
  appt: AppointmentSummary;
  phone: string;
  onUpdated: (a: AppointmentSummary) => void;
}) {
  const [mode, setMode] = useState<"idle" | "reschedule" | "checkin">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payment, setPayment] = useState<PaymentStatusItem>(null);

  const canChange = appt.status === "pending" || appt.status === "confirmed";

  useEffect(() => {
    getAppointmentNotifications(appt.appointment_id, phone).then(setNotifications);
    getPaymentStatusForAppointment(appt.appointment_id, phone).then(setPayment);
  }, [appt.appointment_id, phone]);

  function refresh() {
    startTransition(async () => {
      const updated = await getAppointmentSummary(appt.appointment_id, phone);
      if (updated) onUpdated(updated);
    });
  }

  function handleCancel() {
    if (!confirm("Randevuyu iptal etmek istediğine emin misin?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelMyAppointment({ appointmentId: appt.appointment_id, customerPhone: phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl2 border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">{appt.business_name}</h2>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
            {STATUS_LABELS[appt.status] ?? appt.status}
          </span>
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Hizmet</dt>
            <dd className="text-ink">{appt.service_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Çalışan</dt>
            <dd className="text-ink">{appt.employee_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Tarih / Saat</dt>
            <dd className="text-ink">
              {new Date(appt.starts_at).toLocaleDateString("tr-TR")} · {formatTime(appt.starts_at)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Ücret</dt>
            <dd className="text-ink">{formatPrice(appt.price_at_booking)}</dd>
          </div>
          {payment && (
            <div className="flex justify-between">
              <dt className="text-stone-500">Ödeme</dt>
              <dd className="text-ink">
                {{ pending: "Bekliyor", processing: "İşleniyor", paid: "Ödendi", failed: "Başarısız", canceled: "İptal", refunded: "İade edildi" }[
                  payment.status
                ] ?? payment.status}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {notifications.length > 0 && (
        <div className="rounded-xl2 border border-stone-200 bg-white p-5">
          <h3 className="text-sm font-medium text-stone-500">Geçmiş</h3>
          <ul className="mt-2 space-y-2">
            {notifications.map((n, i) => (
              <li key={i} className="text-sm">
                <span className="text-ink">{n.message}</span>{" "}
                <span className="text-xs text-stone-400">
                  · {new Date(n.created_at).toLocaleDateString("tr-TR")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {canChange && mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("reschedule")}
            className="focus-ring rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-ink hover:border-stone-300"
          >
            Yeniden Planla
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="focus-ring rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            İptal Et
          </button>
          {appt.status === "confirmed" && (
            <button
              onClick={() => setMode("checkin")}
              className="focus-ring rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700"
            >
              Check-in Kodu Oluştur
            </button>
          )}
        </div>
      )}

      {appt.status === "completed" && (
        <Link
          href={`/randevu/${appt.appointment_id}/degerlendir`}
          className="focus-ring inline-block rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700"
        >
          Yorum Bırak
        </Link>
      )}

      {mode === "reschedule" && (
        <RescheduleForm
          appt={appt}
          phone={phone}
          onDone={() => {
            setMode("idle");
            refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      )}

      {mode === "checkin" && <CheckinPanel appointmentId={appt.appointment_id} phone={phone} onClose={() => setMode("idle")} />}
    </div>
  );
}

function RescheduleForm({
  appt,
  phone,
  onDone,
  onCancel,
}: {
  appt: AppointmentSummary;
  phone: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  // getAvailableSlots employeeId/serviceId gerektiriyor ama bunlar appt özetinde
  // yok (isim var, id yok) — bu yüzden server action appointment id'den slot
  // sorgusunu dolaylı yapamaz. Basitleştirme: müşteri yeni tarih/saat girer,
  // reschedule_appointment RPC'si zaten tüm doğrulamayı (çalışma saatleri,
  // çakışma) sunucu tarafında tekrar yapıyor — burada sadece gün seçtiriyoruz.
  const [dateIdx, setDateIdx] = useState(0);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const dateIso = format(days[dateIdx], "yyyy-MM-dd");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!time) return;
    setError(null);
    startTransition(async () => {
      const startsAt = new Date(`${dateIso}T${time}:00+03:00`).toISOString();
      const result = await rescheduleMyAppointment({
        appointmentId: appt.appointment_id,
        customerPhone: phone,
        newStartsAt: startsAt,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl2 border border-stone-200 bg-white p-5">
      <h3 className="font-medium text-ink">Yeni tarih ve saat seç</h3>
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setDateIdx(i)}
            className={`focus-ring flex min-w-[52px] flex-col items-center rounded-lg border px-2.5 py-2 text-sm ${
              i === dateIdx ? "border-ink bg-ink text-white" : "border-stone-200 bg-white text-stone-600"
            }`}
          >
            <span className="text-[11px] uppercase">{format(d, "EEE", { locale: tr })}</span>
            <span className="font-medium">{format(d, "d")}</span>
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="text-xs font-medium text-stone-500">Saat (SS:DD)</span>
        <input
          required
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
        />
      </label>
      <p className="mt-2 text-xs text-stone-400">
        Seçtiğin saat işletmenin çalışma saatleri dışındaysa veya doluysa sunucu tarafında
        reddedilecek ve sana bildirilecek.
      </p>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onCancel} className="focus-ring flex-1 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-600">
          Vazgeç
        </button>
        <button type="submit" disabled={isPending} className="focus-ring flex-1 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60">
          {isPending ? "Kaydediliyor…" : "Yeniden Planla"}
        </button>
      </div>
    </form>
  );
}

function CheckinPanel({ appointmentId, phone, onClose }: { appointmentId: string; phone: string; onClose: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateCheckinToken(appointmentId, phone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.token);
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(result.token, { margin: 1, width: 220 });
      setQrDataUrl(dataUrl);
    });
  }

  return (
    <div className="rounded-xl2 border border-stone-200 bg-white p-5 text-center">
      <h3 className="font-medium text-ink">Check-in Kodu</h3>
      <p className="mt-1 text-sm text-stone-500">İşletmeye geldiğinde bu kodu göster.</p>

      {!token ? (
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="focus-ring mt-4 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {isPending ? "Oluşturuluyor…" : "Kod Oluştur"}
        </button>
      ) : (
        <div className="mt-4">
          {qrDataUrl && (
            <Image src={qrDataUrl} alt="Check-in QR kodu" width={220} height={220} className="mx-auto" unoptimized />
          )}
          <p className="mt-3 font-mono text-lg tracking-wider text-ink">{token}</p>
          <p className="mt-1 text-xs text-stone-400">Bu kod randevu saatinden 2 saat sonra geçersiz olur.</p>
        </div>
      )}

      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <button onClick={onClose} className="focus-ring mt-4 text-sm text-stone-400 hover:text-ink">
        Kapat
      </button>
    </div>
  );
}
