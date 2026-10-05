// Bu dosya, `supabase gen types typescript` komutu ile Supabase projenize
// bağlanıp otomatik üretilebilir. MVP için elle yazılmış, en sık kullanılan
// tablo/tip tanımlarını içerir.

export type BusinessStatus = "pending" | "active" | "rejected" | "suspended";
export type BusinessType = "erkek_beber" | "kadin_kuafor" | "unisex" | "guzellik_salonu";
export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "expired";
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "canceled" | "no_show";
export type UserRole = "customer" | "business_owner" | "business_staff" | "admin";

export interface Business {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  short_code: string;
  description: string | null;
  business_type: BusinessType;
  category_id: string | null;
  phone: string | null;
  instagram_handle: string | null;
  whatsapp_number: string | null;
  city_id: string;
  district_id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_url: string | null;
  brand_color: string | null;
  status: BusinessStatus;
  is_verified: boolean;
  verified_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_status: SubscriptionStatus;
  has_own_website: boolean;
  rating_avg: number;
  rating_count: number;
  profile_view_count: number;
  info_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  is_popular: boolean;
}

export interface City {
  id: string;
  name: string;
  slug: string;
  is_popular: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  icon: string | null;
  sort_order: number;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: "monthly" | "yearly";
  includes_own_website: boolean;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

export interface Employee {
  id: string;
  business_id: string;
  profile_id: string | null;
  full_name: string;
  photo_url: string | null;
  title: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface BusinessHours {
  id: string;
  business_id: string;
  weekday: number;
  is_closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
}

export interface Appointment {
  id: string;
  business_id: string;
  employee_id: string;
  service_id: string;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  note: string | null;
  is_manual: boolean;
  price_at_booking: number;
  created_at: string;
}

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

// Supabase `Database` tip iskeleti — `createClient<Database>` için asgari
// zorunlu şekil. Gerçek projede CLI ile üretilen tam tip dosyasıyla değiştirin.
export type Database = {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any }>;
    Views: Record<string, { Row: any }>;
    Functions: Record<string, { Args: any; Returns: any }>;
    Enums: Record<string, string>;
  };
};
