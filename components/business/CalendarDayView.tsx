"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, subDays } from "date-fns";
import { createScheduleBlock, deleteScheduleBlock } from "@/lib/business-actions";
import { ManualBookingModal } from "./ManualBookingModal";
import type { Employee, Service } from "@/types/database";

type ApptCell = { id: string; status: string; customerName: string; serviceName: string; minutesSpan: number };

export function CalendarDayView({
  date,
  employees,
  services,
  timeSlots,
  appointmentsByEmployee,
  blocksByEmployee,
}: {
  date: string;
  employees: Employee[];
  services: Service[];
  timeSlots: string[]; // ["09:00","09:30",...]
  appointmentsByEmployee: Record<string, Record<string, ApptCell>>; // employeeId -> time -> appt
  blocksByEmployee: Record<string, Record<string, string>>; // employeeId -> time -> scheduleBlockId
}) {
  const router = useRouter();
  const [modalCell, setModalCell] = useState<{ employeeId: string; time: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // İstanbul sabit UTC+3 (DST yok) — gün gezinmede yanlış güne kaymayı önler.
  const d = useMemo(() => new Date(`${date}T00:00:00+03:00`), [date]);

  function goToDate(newDate: Date) {
    router.push(`/panel/takvim?tarih=${format(newDate, "yyyy-MM-dd")}`);
  }

  function handleCloseSlot(employeeId: string, time: string) {
    const startsAt = new Date(`${date}T${time}:00+03:00`);
    const endsAt = new Date(startsAt.getTime() + 30 * 60000);
    startTransition(async () => {
      await createScheduleBlock({
        employeeId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Manuel kapatma",
      });
      router.refresh();
    });
  }

  function handleOpenSlot(blockId: string) {
    startTransition(async () => {
      await deleteScheduleBlock(blockId);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Takvim</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => goToDate(subDays(d, 1))} className="focus-ring rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">←</button>
          <span className="text-sm font-medium text-ink">{format(d, "d MMMM yyyy")}</span>
          <button onClick={() => goToDate(addDays(d, 1))} className="focus-ring rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">→</button>
          <button onClick={() => goToDate(new Date())} className="focus-ring rounded-lg border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">Bugün</button>
        </div>
      </div>

      {employees.length === 0 ? (
        <p className="mt-6 text-stone-500">Takvimi görmek için önce çalışan ekleyin.</p>
      ) : timeSlots.length === 0 ? (
        <div className="mt-6 rounded-xl2 border border-dashed border-stone-300 p-8 text-center text-stone-500">
          İşletme bu gün kapalı görünüyor. Çalışma saatlerini &quot;Çalışma Saatleri&quot; sayfasından düzenleyebilirsin.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl2 border border-stone-200 bg-white">
          <table className="w-full min-w-[600px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-20 border-b border-stone-200 px-3 py-2.5 text-left text-xs font-medium text-stone-400">Saat</th>
                {employees.map((e) => (
                  <th key={e.id} className="border-b border-l border-stone-200 px-3 py-2.5 text-left font-medium text-ink">
                    {e.full_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time}>
                  <td className="border-b border-stone-100 px-3 py-2 text-xs text-stone-400">{time}</td>
                  {employees.map((e) => {
                    const appt = appointmentsByEmployee[e.id]?.[time];
                    const blockId = blocksByEmployee[e.id]?.[time];
                    return (
                      <td key={e.id} className="border-b border-l border-stone-100 p-1.5 align-top">
                        {appt ? (
                          <div
                            className={`rounded-lg px-2.5 py-1.5 text-xs ${
                              appt.status === "canceled"
                                ? "bg-stone-100 text-stone-400 line-through"
                                : appt.status === "pending"
                                ? "bg-stone-100 text-stone-700"
                                : "bg-moss-50 text-moss-700"
                            }`}
                          >
                            <p className="font-medium">{appt.customerName}</p>
                            <p>{appt.serviceName}</p>
                          </div>
                        ) : blockId ? (
                          <button
                            onClick={() => handleOpenSlot(blockId)}
                            disabled={isPending}
                            title="Tekrar açmak için tıkla"
                            className="focus-ring flex h-10 w-full items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400 hover:bg-stone-200 disabled:opacity-50"
                          >
                            KAPALI · Aç
                          </button>
                        ) : (
                          <div className="flex h-10 gap-1">
                            <button
                              onClick={() => setModalCell({ employeeId: e.id, time })}
                              className="focus-ring flex-1 rounded-lg text-stone-300 hover:bg-stone-50 hover:text-stone-500"
                            >
                              BOŞ
                            </button>
                            <button
                              onClick={() => handleCloseSlot(e.id, time)}
                              disabled={isPending}
                              title="Bu saati kapat"
                              className="focus-ring rounded-lg px-1.5 text-stone-300 hover:bg-stone-50 hover:text-red-400 disabled:opacity-50"
                            >
                              🔒
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalCell && (
        <ManualBookingModal
          employeeId={modalCell.employeeId}
          date={date}
          time={modalCell.time}
          services={services}
          employees={employees}
          onClose={() => setModalCell(null)}
        />
      )}
    </div>
  );
}
