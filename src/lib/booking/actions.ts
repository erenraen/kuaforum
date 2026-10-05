"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { AvailableSlot } from "@/types/database";

const bookingSchema = z.object({
  businessId: z.string().uuid(),
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string(), // ISO timestamp
  customerName: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s]{10,15}$/, "Geçerli bir telefon numarası girin."),
  note: z.string().trim().max(300).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export type BookingResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Müşteri tarafındaki randevu formu bu action'ı çağırır. Tüm çakışma kontrolü
// veritabanındaki `book_appointment` fonksiyonu (EXCLUDE constraint ile) yapar,
// bu yüzden burada race-condition riski yoktur.
export async function createAppointment(input: BookingInput): Promise<BookingResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, error: "Formda hatalar var.", fieldErrors };
  }

  const supabase = createClient();
  const { businessId, employeeId, serviceId, startsAt, customerName, customerPhone, note } =
    parsed.data;

  const { data, error } = await supabase.rpc("book_appointment", {
    p_business_id: businessId,
    p_employee_id: employeeId,
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_note: note || null,
  });

  if (error) {
    // "23P01" = exclusion_violation -> book_appointment() bunu okunur bir
    // mesaja çeviriyor zaten (bkz. supabase/02_functions.sql)
    return { ok: false, error: friendlyError(error.message, "Randevu oluşturulamadı.") };
  }

  return { ok: true, appointmentId: (data as any).id };
}

export async function getAvailableSlots(params: {
  businessId: string;
  employeeId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
}): Promise<AvailableSlot[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_business_id: params.businessId,
    p_employee_id: params.employeeId,
    p_service_id: params.serviceId,
    p_date: params.date,
  });

  if (error) {
    console.error("get_available_slots error:", error.message);
    return [];
  }
  return (data as AvailableSlot[]) ?? [];
}

// ---------------------------------------------------------------------------
// YORUM (misafir müşteri, telefon doğrulamalı — bkz. supabase/05_reviews_fix.sql)
// ---------------------------------------------------------------------------
export type AppointmentForReview = {
  appointment_id: string;
  business_name: string;
  business_slug: string;
  service_name: string;
  starts_at: string;
  status: string;
  already_reviewed: boolean;
};

export async function getAppointmentForReview(appointmentId: string): Promise<AppointmentForReview | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc("get_appointment_for_review", { p_appointment_id: appointmentId })
    .maybeSingle();

  if (error || !data) return null;
  return data as AppointmentForReview;
}

// ---------------------------------------------------------------------------
// RANDEVU HUB'I (müşteri kendi randevusunu görüntüler/iptal eder/yeniden
// planlar) — telefon doğrulamalı, hesapsız. Aynı güvenlik deseni yorum/QR ile
// aynı: appointment id + telefon eşleşmesi gerekir.
// ---------------------------------------------------------------------------
export type AppointmentSummary = {
  appointment_id: string;
  business_name: string;
  business_slug: string;
  service_name: string;
  employee_name: string;
  starts_at: string;
  status: string;
  price_at_booking: number;
};

export async function getAppointmentSummary(appointmentId: string, phone: string): Promise<AppointmentSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, status, price_at_booking, businesses(name, slug), services(name), employees(full_name), customers!inner(phone)")
    .eq("id", appointmentId)
    .eq("customers.phone", phone)
    .maybeSingle();

  if (error || !data) return null;
  const d = data as any;
  return {
    appointment_id: d.id,
    business_name: d.businesses?.name ?? "",
    business_slug: d.businesses?.slug ?? "",
    service_name: d.services?.name ?? "",
    employee_name: d.employees?.full_name ?? "",
    starts_at: d.starts_at,
    status: d.status,
    price_at_booking: d.price_at_booking,
  };
}

const cancelSchema = z.object({
  appointmentId: z.string().uuid(),
  customerPhone: z.string().trim().min(10),
});

export async function cancelMyAppointment(input: z.infer<typeof cancelSchema>): Promise<ReviewResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form hatalı." };
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_appointment", {
    p_appointment_id: parsed.data.appointmentId,
    p_customer_phone: parsed.data.customerPhone,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  customerPhone: z.string().trim().min(10),
  newStartsAt: z.string(),
});

export async function rescheduleMyAppointment(input: z.infer<typeof rescheduleSchema>): Promise<ReviewResult> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form hatalı." };
  const supabase = createClient();
  const { error } = await supabase.rpc("reschedule_appointment", {
    p_appointment_id: parsed.data.appointmentId,
    p_customer_phone: parsed.data.customerPhone,
    p_new_starts_at: parsed.data.newStartsAt,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

export async function generateCheckinToken(appointmentId: string, phone: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("generate_checkin_token", {
    p_appointment_id: appointmentId,
    p_customer_phone: phone,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true, token: data as string };
}

// ---------------------------------------------------------------------------
// BEKLEME LİSTESİ
// ---------------------------------------------------------------------------
const waitlistSchema = z.object({
  businessId: z.string().uuid(),
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  desiredDate: z.string(),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(10),
});

export async function joinWaitlist(input: z.infer<typeof waitlistSchema>): Promise<ReviewResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form hatalı." };
  const supabase = createClient();
  const { error } = await supabase.rpc("join_waitlist", {
    p_business_id: parsed.data.businessId,
    p_employee_id: parsed.data.employeeId,
    p_service_id: parsed.data.serviceId,
    p_desired_date: parsed.data.desiredDate,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
  });
  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}

const reviewSchema = z.object({
  appointmentId: z.string().uuid(),
  customerPhone: z.string().trim().min(10, "Geçerli bir telefon numarası girin."),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReview(input: z.infer<typeof reviewSchema>): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." };

  const supabase = createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_appointment_id: parsed.data.appointmentId,
    p_customer_phone: parsed.data.customerPhone,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment || null,
  });

  if (error) return { ok: false, error: friendlyError(error.message) };
  return { ok: true };
}
