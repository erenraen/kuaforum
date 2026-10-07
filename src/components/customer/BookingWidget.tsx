"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { tr } from "date-fns/locale";
import { getAvailableSlots, createAppointment, joinWaitlist } from "@/lib/booking/actions";
import { formatPrice, formatTime } from "@/lib/utils";
import type { AvailableSlot, Employee, Service } from "@/types/database";

type EmployeeWithServices = Employee & { employee_services: { service_id: string }[] };

function WaitlistJoin({
  businessId,
  employeeId,
  serviceId,
  date,
}: {
  businessId: string;
  employeeId: string;
  serviceId: string;
  date: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status === "done") {
    return <p className="mt-2 text-sm text-moss-700">Bekleme listesine eklendin. Bu saat boşalırsa seni haberdar edebilmemiz için işletmeyle iletişimde kalabilirsin.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring mt-2 text-sm font-medium text-moss-700 hover:underline"
      >
        Bu saat boşalırsa haber ver
      </button>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("pending");
        setError(null);
        const result = await joinWaitlist({
          businessId,
          employeeId,
          serviceId,
          desiredDate: date,
          customerName: name,
          customerPhone: phone,
        });
        if (!result.ok) {
          setError(result.error);
          setStatus("error");
          return;
        }
        setStatus("done");
      }}
      className="mt-2 space-y-2"
    >
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ad Soyad"
        className="focus-ring w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
      />
      <input
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Telefon"
        className="focus-ring w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={status === "pending"}
        className="focus-ring rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white hover:bg-moss-700 disabled:opacity-60"
      >
        {status === "pending" ? "Ekleniyor…" : "Bekleme Listesine Katıl"}
      </button>
    </form>
  );
}

export function BookingWidget({
  businessId,
  businessSlug,
  businessName,
  services,
  employees,
}: {
  businessId: string;
  businessSlug: string;
  businessName: string;
  services: Service[];
  employees: EmployeeWithServices[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [dateIdx, setDateIdx] = useState(0);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)),
    []
  );
  const selectedDate = days[dateIdx];
  const dateIso = format(selectedDate, "yyyy-MM-dd");

  const eligibleEmployees = useMemo(
    () => employees.filter((e) => e.employee_services.some((es) => es.service_id === serviceId)),
    [employees, serviceId]
  );

  useEffect(() => {
    if (eligibleEmployees.length > 0 && !eligibleEmployees.find((e) => e.id === employeeId)) {
      setEmployeeId(eligibleEmployees[0].id);
    }
  }, [eligibleEmployees, employeeId]);

  useEffect(() => {
    if (!employeeId || !serviceId) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    getAvailableSlots({ businessId, employeeId, serviceId, date: dateIso })
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [businessId, employeeId, serviceId, dateIso]);

  const selectedService = services.find((s) => s.id === serviceId);
  const availableSlots = slots.filter((s) => s.is_available);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setFormError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await createAppointment({
        businessId,
        employeeId,
        serviceId,
        startsAt: selectedSlot.slot_start,
        customerName: name,
        customerPhone: phone,
        note: note || undefined,
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        // saat başkası tarafından alınmışsa listeyi tazele
        setLoadingSlots(true);
        getAvailableSlots({ businessId, employeeId, serviceId, date: dateIso })
          .then(setSlots)
          .finally(() => setLoadingSlots(false));
        setSelectedSlot(null);
        return;
      }

      const params = new URLSearchParams({
        isletme: businessSlug,
        isletmeAdi: businessName,
        randevuId: result.appointmentId,
        hizmet: selectedService?.name ?? "",
        tarih: dateIso,
        saat: formatTime(selectedSlot.slot_start),
        ad: name,
      });
      router.push(`/randevu/basarili?${params}`);
    });
  }

  return (
    <div className="rounded-xl2 border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl text-ink">Randevu Al</h2>

      {/* ADIM 1: hizmet + çalışan */}
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-stone-500">Hizmet</span>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setStep(1);
            }}
            className="focus-ring mt-1 w-full rounded-lg border border-stone-200 bg-paper px-3 py-2.5 text-sm"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatPrice(s.price)} · {s.duration_minutes} dk
              </option>
            ))}
          </select>
        </label>

        {eligibleEmployees.length > 1 && (
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Çalışan</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 bg-paper px-3 py-2.5 text-sm"
            >
              {eligibleEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} {e.title ? `— ${e.title}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {eligibleEmployees.length === 0 && (
          <p className="rounded-lg bg-clay-50 px-3 py-2 text-sm text-clay-600">
            Bu hizmet için şu anda müsait çalışan bulunmuyor.
          </p>
        )}
      </div>

      {/* ADIM 2: tarih */}
      {eligibleEmployees.length > 0 && (
        <div className="mt-5">
          <span className="text-xs font-medium text-stone-500">Tarih</span>
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {days.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDateIdx(i)}
                className={`focus-ring flex min-w-[52px] flex-col items-center rounded-lg border px-2.5 py-2 text-sm transition-colors ${
                  i === dateIdx
                    ? "border-ink bg-ink text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                <span className="text-[11px] uppercase">{format(d, "EEE", { locale: tr })}</span>
                <span className="font-medium">{format(d, "d")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ADIM 3: saat */}
      {eligibleEmployees.length > 0 && (
        <div className="mt-5">
          <span className="text-xs font-medium text-stone-500">Müsait saatler</span>
          {loadingSlots ? (
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-stone-100" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="mt-2 rounded-lg bg-stone-50 px-3 py-3">
              <p className="text-sm text-stone-500">Bu tarihte müsait saat yok. Başka bir gün deneyin.</p>
              <WaitlistJoin businessId={businessId} employeeId={employeeId} serviceId={serviceId} date={dateIso} />
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {availableSlots.map((s) => (
                <button
                  key={s.slot_start}
                  type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`focus-ring rounded-lg border px-2 py-2 text-sm transition-colors ${
                    selectedSlot?.slot_start === s.slot_start
                      ? "border-moss-600 bg-moss-600 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-moss-300"
                  }`}
                >
                  {formatTime(s.slot_start)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* İLETİŞİM FORMU */}
      {selectedSlot && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-stone-200 pt-5">
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Ad Soyad</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
              placeholder="Ad Soyad"
            />
            {fieldErrors.customerName && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p>
            )}
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Telefon</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              type="tel"
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
              placeholder="05XX XXX XX XX"
            />
            {fieldErrors.customerPhone && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.customerPhone}</p>
            )}
          </label>
          <label className="block">
            <span className="text-xs font-medium text-stone-500">Not (isteğe bağlı)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="focus-ring mt-1 w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm"
              placeholder="Eklemek istediğin bir şey var mı?"
            />
          </label>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="focus-ring w-full rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-moss-700 disabled:opacity-60"
          >
            {isPending ? "Randevu oluşturuluyor…" : `${formatTime(selectedSlot.slot_start)} için Randevu Al`}
          </button>
        </form>
      )}
    </div>
  );
}
