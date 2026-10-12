import { getCurrentBusiness } from "@/lib/business";
import { createClient } from "@/lib/supabase/server";
import { CalendarDayView } from "@/components/business/CalendarDayView";
import { formatTime, todayIso, istanbulDayBounds } from "@/lib/utils";

function buildTimeSlots(open: string, close: string, stepMinutes = 30) {
  const slots: string[] = [];
  let [h, m] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  while (h * 60 + m < ch * 60 + cm) {
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += stepMinutes;
    if (m >= 60) { m -= 60; h += 1; }
  }
  return slots;
}

export default async function CalendarPage({ searchParams }: { searchParams: { tarih?: string } }) {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  const date = searchParams.tarih ?? todayIso();
  const supabase = createClient();

  // Haftanın günü İstanbul takvimine göre hesaplanır (Türkiye sabit UTC+3,
  // DST yok — bu yüzden sabit ofset güvenli ve doğru).
  const weekday = new Date(`${date}T12:00:00+03:00`).getDay();
  const { start: dayStart, end: dayEnd } = istanbulDayBounds(date);

  const [{ data: employees }, { data: services }, { data: businessHours }, { data: appointments }, { data: blocks }] =
    await Promise.all([
      supabase.from("employees").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
      supabase.from("services").select("*").eq("business_id", business.id).eq("is_active", true),
      supabase.from("business_hours").select("*").eq("business_id", business.id).eq("weekday", weekday).maybeSingle(),
      supabase
        .from("appointments")
        .select("*, services(name), customers(full_name)")
        .eq("business_id", business.id)
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString())
        .neq("status", "canceled"),
      supabase
        .from("schedule_blocks")
        .select("*")
        .eq("business_id", business.id)
        .lte("starts_at", dayEnd.toISOString())
        .gte("ends_at", dayStart.toISOString()),
    ]);

  const timeSlots =
    businessHours && !businessHours.is_closed && businessHours.opens_at && businessHours.closes_at
      ? buildTimeSlots(businessHours.opens_at.slice(0, 5), businessHours.closes_at.slice(0, 5))
      : [];

  const appointmentsByEmployee: Record<string, Record<string, any>> = {};
  for (const a of appointments ?? []) {
    const time = formatTime(a.starts_at);
    appointmentsByEmployee[a.employee_id] ??= {};
    appointmentsByEmployee[a.employee_id][time] = {
      id: a.id,
      status: a.status,
      customerName: a.customers?.full_name ?? "Müşteri",
      serviceName: a.services?.name ?? "",
    };
  }

  // Bloklar belirli bir çalışana özel olabilir (employee_id dolu) ya da tüm
  // işletmeyi kapatabilir (employee_id null) — null ise tüm çalışan sütunlarına
  // uygula.
  const blocksByEmployee: Record<string, Record<string, string>> = {};
  for (const b of blocks ?? []) {
    const targetEmployees = b.employee_id ? [b.employee_id] : (employees ?? []).map((e) => e.id);
    for (const empId of targetEmployees) {
      for (const time of timeSlots) {
        const slotStart = new Date(`${date}T${time}:00+03:00`);
        if (slotStart >= new Date(b.starts_at) && slotStart < new Date(b.ends_at)) {
          blocksByEmployee[empId] ??= {};
          blocksByEmployee[empId][time] = b.id;
        }
      }
    }
  }

  return (
    <CalendarDayView
      date={date}
      employees={employees ?? []}
      services={services ?? []}
      timeSlots={timeSlots}
      appointmentsByEmployee={appointmentsByEmployee}
      blocksByEmployee={blocksByEmployee}
    />
  );
}
