"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Giriş yapmalısınız.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") throw new Error("Bu işlem için admin yetkisi gerekiyor.");
  return supabase;
}

// ---------------------------------------------------------------------------
// İŞLETME ONAYLAMA / REDDETME / DOĞRULAMA / ASKIYA ALMA
// ---------------------------------------------------------------------------
export async function setBusinessStatus(
  businessId: string,
  status: "active" | "rejected" | "suspended" | "pending"
): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("businesses").update({ status }).eq("id", businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/isletmeler");
  return { ok: true };
}

export async function toggleBusinessVerification(businessId: string, verified: boolean): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("businesses")
    .update({ is_verified: verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/isletmeler");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// YENİ İŞLETME EKLEME (admin, Instagram üzerinden gelen bilgilerle 1-2 dakikada ekler)
// ---------------------------------------------------------------------------
const newBusinessSchema = z.object({
  name: z.string().trim().min(2, "İşletme adı gerekli."),
  slug: z
    .string()
    .trim()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug sadece küçük harf, rakam ve tire içerebilir."),
  businessType: z.enum(["erkek_beber", "kadin_kuafor", "unisex", "guzellik_salonu"]),
  categoryId: z.string().uuid(),
  cityId: z.string().uuid(),
  districtId: z.string().uuid(),
  address: z.string().optional(),
  phone: z.string().optional(),
  instagramHandle: z.string().optional(),
  ownerEmail: z.string().email("Geçerli bir e-posta girin."),
  ownerName: z.string().trim().min(2, "Sahibinin adı gerekli."),
});

export async function createBusinessByAdmin(
  input: z.infer<typeof newBusinessSchema>
): Promise<ActionResult & { tempPassword?: string }> {
  await requireAdmin();
  const parsed = newBusinessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Form hatalı." };

  const admin = createAdminClient();
  const d = parsed.data;

  // 1) İşletme sahibi için giriş hesabı oluştur (yoksa)
  const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: d.ownerEmail,
    password: tempPassword,
    email_confirm: true,
  });

  let ownerId: string;
  if (createUserError) {
    // kullanıcı zaten varsa listeden bul
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === d.ownerEmail);
    if (!existing) return { ok: false, error: createUserError.message };
    ownerId = existing.id;
  } else {
    ownerId = created.user.id;
  }

  await admin.from("profiles").upsert({ id: ownerId, role: "business_owner", full_name: d.ownerName });

  // 2) İşletmeyi oluştur
  const { data: business, error: bizError } = await admin
    .from("businesses")
    .insert({
      name: d.name,
      slug: d.slug,
      business_type: d.businessType,
      category_id: d.categoryId,
      city_id: d.cityId,
      district_id: d.districtId,
      address: d.address || null,
      phone: d.phone || null,
      instagram_handle: d.instagramHandle || null,
      owner_id: ownerId,
      status: "active",
    })
    .select("id")
    .single();

  if (bizError) return { ok: false, error: bizError.message };

  // 3) Üyelik ilişkisini kur
  await admin.from("business_members").insert({ business_id: business.id, profile_id: ownerId, role: "owner" });

  // 4) Varsayılan çalışma saatleri (09:00-20:00, her gün)
  await admin.from("business_hours").insert(
    Array.from({ length: 7 }, (_, weekday) => ({
      business_id: business.id,
      weekday,
      is_closed: false,
      opens_at: "09:00",
      closes_at: "20:00",
    }))
  );

  revalidatePath("/admin/isletmeler");
  return { ok: true, tempPassword: createUserError ? undefined : tempPassword };
}

// ---------------------------------------------------------------------------
// ŞEHİR / İLÇE / KATEGORİ YÖNETİMİ
// ---------------------------------------------------------------------------
function slugifyTr(text: string) {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function addCity(name: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("cities").insert({ name, slug: slugifyTr(name) });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sehir-ilce");
  return { ok: true };
}

export async function addDistrict(cityId: string, name: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("districts").insert({ city_id: cityId, name, slug: slugifyTr(name) });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sehir-ilce");
  return { ok: true };
}

export async function addCategory(name: string, businessType: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("categories")
    .insert({ name, slug: slugifyTr(name), business_type: businessType });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/kategoriler");
  return { ok: true };
}

export async function updatePlanPrice(planId: string, price: number): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("plans").update({ price }).eq("id", planId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/paketler");
  return { ok: true };
}

export async function togglePlanActive(planId: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("plans").update({ is_active: isActive }).eq("id", planId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/paketler");
  return { ok: true };
}
