"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireBusiness() {
  const { business } = await getCurrentBusiness();
  if (!business) throw new Error("Yetkili olduğunuz bir işletme bulunamadı.");
  return business;
}

// Yapısal/finansal işlemler (profil, fiyatlandırma, çalışan yönetimi, web
// sitesi) sadece işletme SAHİBİ tarafından yapılabilir; staff bu işlemlere
// erişemez. Bu kontrol RLS seviyesinde de ayrıca uygulanıyor (bkz.
// 07_hardening.sql, is_business_owner) — burada erken ve anlaşılır bir hata
// mesajı vermek için tekrar ediliyor, güvenliğin TEK katmanı bu değil.
async function requireBusinessOwner() {
  const { business, role } = await getCurrentBusiness();
  if (!business) throw new Error("Yetkili olduğunuz bir işletme bulunamadı.");
  if (role !== "owner") throw new Error("Bu işlem için işletme sahibi yetkisi gerekiyor.");
  return business;
}

// ---------------------------------------------------------------------------
// RANDEVU DURUMU GÜNCELLEME
// ---------------------------------------------------------------------------
export async function updateAppointmentStatus(
  appointmentId: string,
  status: "pending" | "confirmed" | "completed" | "canceled" | "no_show"
): Promise<ActionResult> {
  const business = await requireBusiness();
  const supabase = createClient();

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("business_id", business.id); // RLS zaten koruyor, ek güvenlik katmanı

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/randevular");
  revalidatePath("/panel/takvim");
  revalidatePath("/panel");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// MANUEL RANDEVU OLUŞTURMA (işletme panelinden)
// ---------------------------------------------------------------------------
const manualBookingSchema = z.object({
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string(),
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().min(10),
  note: z.string().optional(),
});

export async function createManualAppointment(input: z.infer<typeof manualBookingSchema>): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = manualBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form bilgileri eksik veya hatalı." };

  const supabase = createClient();
  const { error } = await supabase.rpc("book_appointment_manual", {
    p_business_id: business.id,
    p_employee_id: parsed.data.employeeId,
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
    p_note: parsed.data.note || null,
    p_status: "confirmed",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/takvim");
  revalidatePath("/panel/randevular");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// HİZMET YÖNETİMİ
// ---------------------------------------------------------------------------
const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Hizmet adı gerekli."),
  description: z.string().optional(),
  price: z.coerce.number().positive("Fiyat 0'dan büyük olmalı."),
  duration_minutes: z.coerce.number().int().positive().multipleOf(5, "Süre 5 dakikanın katı olmalı."),
  is_active: z.coerce.boolean().default(true),
});

export async function upsertService(input: z.infer<typeof serviceSchema>): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." };

  const supabase = createClient();
  const { id, ...rest } = parsed.data;

  const { error } = id
    ? await supabase.from("services").update(rest).eq("id", id).eq("business_id", business.id)
    : await supabase.from("services").insert({ ...rest, business_id: business.id });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/hizmetler");
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase.from("services").delete().eq("id", id).eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/hizmetler");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ÇALIŞAN YÖNETİMİ
// ---------------------------------------------------------------------------
const employeeSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2, "Ad soyad gerekli."),
  title: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
  serviceIds: z.array(z.string().uuid()).default([]),
});

export async function upsertEmployee(input: z.infer<typeof employeeSchema>): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." };

  const supabase = createClient();
  const { id, serviceIds, ...rest } = parsed.data;

  let employeeId = id;
  if (id) {
    const { error } = await supabase.from("employees").update(rest).eq("id", id).eq("business_id", business.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("employees")
      .insert({ ...rest, business_id: business.id })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    employeeId = data.id;
  }

  if (employeeId) {
    await supabase.from("employee_services").delete().eq("employee_id", employeeId);
    if (serviceIds.length > 0) {
      await supabase
        .from("employee_services")
        .insert(serviceIds.map((serviceId) => ({ employee_id: employeeId!, service_id: serviceId })));
    }
  }

  revalidatePath("/panel/calisanlar");
  return { ok: true };
}

export async function deleteEmployee(id: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase.from("employees").delete().eq("id", id).eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/calisanlar");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// ÇALIŞMA SAATLERİ
// ---------------------------------------------------------------------------
const hoursSchema = z.array(
  z.object({
    weekday: z.number().min(0).max(6),
    is_closed: z.boolean(),
    opens_at: z.string().nullable(),
    closes_at: z.string().nullable(),
  })
);

export async function updateBusinessHours(hours: z.infer<typeof hoursSchema>): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const parsed = hoursSchema.safeParse(hours);
  if (!parsed.success) return { ok: false, error: "Saat bilgileri hatalı." };

  const supabase = createClient();
  const { error } = await supabase
    .from("business_hours")
    .upsert(
      parsed.data.map((h) => ({ ...h, business_id: business.id })),
      { onConflict: "business_id,weekday" }
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/calisma-saatleri");
  revalidatePath(`/isletme/${business.slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// İŞLETME PROFİLİ
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional(),
  phone: z.string().optional(),
  instagram_handle: z.string().optional(),
  address: z.string().optional(),
  logo_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
});

export async function updateBusinessProfile(input: z.infer<typeof profileSchema>): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." };

  const supabase = createClient();
  const { error } = await supabase
    .from("businesses")
    .update({ ...parsed.data, info_updated_at: new Date().toISOString() })
    .eq("id", business.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/profil");
  revalidatePath(`/isletme/${business.slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// SON DAKİKA BOŞLUĞU
// ---------------------------------------------------------------------------
const lastMinuteSchema = z.object({
  employeeId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startsAt: z.string(),
  durationMinutes: z.coerce.number().positive(),
});

export async function createLastMinuteSlot(input: z.infer<typeof lastMinuteSchema>): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = lastMinuteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form hatalı." };

  const supabase = createClient();
  // Tüm doğrulama (employee/service işletmeye ait mi, employee bu service'i
  // veriyor mu, çakışma var mı, geçmiş saat mi) artık PostgreSQL tarafında
  // create_last_minute_slot() RPC'si içinde yapılıyor — bkz. 07_hardening.sql.
  const { error } = await supabase.rpc("create_last_minute_slot", {
    p_business_id: business.id,
    p_employee_id: parsed.data.employeeId,
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/son-dakika");
  revalidatePath("/");
  return { ok: true };
}

export async function deactivateLastMinuteSlot(id: string): Promise<ActionResult> {
  const business = await requireBusiness();
  const supabase = createClient();
  const { error } = await supabase
    .from("last_minute_slots")
    .update({ is_active: false })
    .eq("id", id)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/son-dakika");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// TAKVİMDEN SAAT KAPATMA / MANUEL RANDEVU İPTALİ
// ---------------------------------------------------------------------------
const blockSchema = z.object({
  employeeId: z.string().uuid().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().optional(),
});

export async function toggleOwnWebsite(enabled: boolean): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase.from("businesses").update({ has_own_website: enabled }).eq("id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/web-sitesi");
  revalidatePath(`/site/${business.slug}`);
  return { ok: true };
}

export async function createScheduleBlock(input: z.infer<typeof blockSchema>): Promise<ActionResult> {
  const business = await requireBusiness();
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Form hatalı." };

  const supabase = createClient();
  const { error } = await supabase.from("schedule_blocks").insert({
    business_id: business.id,
    employee_id: parsed.data.employeeId || null,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    reason: parsed.data.reason || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/takvim");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// QR CHECK-IN DOĞRULAMA (işletme panelinden)
// ---------------------------------------------------------------------------
export type CheckinResult =
  | { ok: true; customerName: string; serviceName: string; startsAt: string; alreadyScanned: boolean }
  | { ok: false; error: string };

export async function redeemCheckin(token: string): Promise<CheckinResult> {
  await requireBusiness();
  const supabase = createClient();
  const { data, error } = await supabase.rpc("redeem_checkin_token", { p_token: token.trim() }).maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Kod bulunamadı." };
  const d = data as any;
  return {
    ok: true,
    customerName: d.customer_name,
    serviceName: d.service_name,
    startsAt: d.starts_at,
    alreadyScanned: d.already_scanned,
  };
}

export async function deleteScheduleBlock(id: string): Promise<ActionResult> {
  const business = await requireBusiness();
  const supabase = createClient();
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", id).eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/takvim");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// GÖRSELLER (logo, kapak, galeri, çalışan fotoğrafı — Supabase Storage)
// ---------------------------------------------------------------------------
export async function updateBusinessImage(field: "logo_url" | "cover_url", url: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase.from("businesses").update({ [field]: url }).eq("id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/profil");
  revalidatePath(`/isletme/${business.slug}`);
  revalidatePath(`/site/${business.slug}`);
  return { ok: true };
}

export async function updateEmployeePhoto(employeeId: string, url: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("employees")
    .update({ photo_url: url })
    .eq("id", employeeId)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/calisanlar");
  revalidatePath(`/isletme/${business.slug}`);
  return { ok: true };
}

export async function addBusinessPhoto(url: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { count } = await supabase
    .from("business_photos")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);
  const { error } = await supabase
    .from("business_photos")
    .insert({ business_id: business.id, url, sort_order: count ?? 0 });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/galeri");
  revalidatePath(`/isletme/${business.slug}`);
  revalidatePath(`/site/${business.slug}`);
  return { ok: true };
}

export async function removeBusinessPhoto(photoId: string): Promise<ActionResult> {
  const business = await requireBusinessOwner();
  const supabase = createClient();
  const { error } = await supabase
    .from("business_photos")
    .delete()
    .eq("id", photoId)
    .eq("business_id", business.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/panel/galeri");
  return { ok: true };
}
