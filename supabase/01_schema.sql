-- ============================================================================
-- KUAFÖRÜM MVP — VERİTABANI ŞEMASI
-- Supabase / PostgreSQL
-- Sıra: 01_schema.sql -> 02_functions.sql -> 03_rls.sql -> 04_seed.sql
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- çakışma engelleme (exclude constraint) için

-- ----------------------------------------------------------------------------
-- ENUM TİPLERİ
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'business_owner', 'business_staff', 'admin');
create type business_status as enum ('pending', 'active', 'rejected', 'suspended');
create type business_type as enum ('erkek_beber', 'kadin_kuafor', 'unisex', 'guzellik_salonu');
create type subscription_status as enum ('trial', 'active', 'past_due', 'canceled', 'expired');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'canceled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type billing_period as enum ('monthly', 'yearly');

-- ----------------------------------------------------------------------------
-- PROFİLLER (auth.users genişletmesi)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- İL / İLÇE (SEO ve keşif için)
-- ----------------------------------------------------------------------------
create table cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique, -- "istanbul"
  is_popular boolean not null default false,
  created_at timestamptz not null default now()
);

create table districts (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references cities(id) on delete cascade,
  name text not null, -- "Kadıköy"
  slug text not null, -- "kadikoy"
  is_popular boolean not null default false,
  created_at timestamptz not null default now(),
  unique (city_id, slug)
);

-- ----------------------------------------------------------------------------
-- KATEGORİLER (kuaförler, berberler, güzellik salonları...)
-- ----------------------------------------------------------------------------
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,        -- "Berberler"
  slug text not null unique,        -- "berberler"
  business_type business_type not null,
  icon text,
  sort_order int not null default 0
);

-- ----------------------------------------------------------------------------
-- PAKETLER (Plan 1 / 2 / 3) — admin panelden fiyat değiştirilebilir
-- ----------------------------------------------------------------------------
create table plans (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,         -- "platform_ilani", "kendi_site", "premium"
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  billing_period billing_period not null default 'monthly',
  includes_own_website boolean not null default false,
  is_featured boolean not null default false, -- öne çıkarılmış / premium
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- İŞLETMELER (multi-tenant kök tablo)
-- ----------------------------------------------------------------------------
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references profiles(id) on delete set null,

  name text not null,
  slug text not null unique,          -- "gozde-barber"
  short_code text not null unique,    -- instagram kısa link: /r/{short_code}
  description text,
  business_type business_type not null default 'unisex',
  category_id uuid references categories(id),

  phone text,
  instagram_handle text,
  whatsapp_number text,

  city_id uuid not null references cities(id),
  district_id uuid not null references districts(id),
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),

  logo_url text,
  cover_url text,
  brand_color text default '#111827',

  status business_status not null default 'pending',
  is_verified boolean not null default false,
  verified_at timestamptz,

  -- deneme / üyelik
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  subscription_status subscription_status not null default 'trial',

  -- kendi web sitesi
  has_own_website boolean not null default false,

  -- ortalama puan (denormalized, trigger ile güncellenir)
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,

  profile_view_count int not null default 0,

  info_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_businesses_city_district on businesses(city_id, district_id);
create index idx_businesses_status on businesses(status);
create index idx_businesses_slug on businesses(slug);

-- İşletme personeli / sahibi ile kullanıcı ilişkisi (bir kullanıcı birden çok işletmede çalışabilir - ileride çoklu şube için)
create table business_members (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'owner', -- 'owner' | 'staff'
  created_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- İŞLETME GALERİSİ
-- ----------------------------------------------------------------------------
create table business_photos (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ÇALIŞANLAR
-- ----------------------------------------------------------------------------
create table employees (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null, -- girişi olan bir çalışan hesabına bağlanabilir
  full_name text not null,
  photo_url text,
  title text, -- "Kuaför", "Berber", "Nail Art Uzmanı"
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- HİZMETLER
-- ----------------------------------------------------------------------------
create table services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,             -- "Saç Kesimi"
  description text,
  price numeric(10,2) not null,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes % 5 = 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_services_business on services(business_id) where is_active;

-- Hangi çalışan hangi hizmeti verebilir
create table employee_services (
  employee_id uuid not null references employees(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (employee_id, service_id)
);

-- ----------------------------------------------------------------------------
-- ÇALIŞMA SAATLERİ (işletme geneli ve çalışan bazlı override edilebilir)
-- weekday: 0=Pazar ... 6=Cumartesi (PostgreSQL EXTRACT(DOW) ile uyumlu)
-- ----------------------------------------------------------------------------
create table business_hours (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  unique (business_id, weekday)
);

create table employee_hours (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  unique (employee_id, weekday)
);

-- İşletmenin belirli bir günü tamamen kapatması (tatil vs) veya çalışanın belirli saati kapatması
create table schedule_blocks (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade, -- null ise tüm işletme
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- ----------------------------------------------------------------------------
-- MÜŞTERİLER (işletme bazlı hafif kayıt — kayıtsız randevu alınabilir)
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index idx_customers_phone on customers(phone);

-- ----------------------------------------------------------------------------
-- RANDEVULAR — sistemin kalbi
-- Çakışma DB seviyesinde `EXCLUDE` constraint ile engellenir (aşağıda).
-- ----------------------------------------------------------------------------
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  service_id uuid not null references services(id),
  customer_id uuid not null references customers(id),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status appointment_status not null default 'pending',
  note text,
  is_manual boolean not null default false, -- işletme tarafından elle oluşturulan

  price_at_booking numeric(10,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (ends_at > starts_at),

  -- AYNI ÇALIŞAN İÇİN ZAMAN ARALIKLARI ÇAKIŞAMAZ (iptal edilenler hariç)
  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'canceled')
);

create index idx_appointments_business_date on appointments(business_id, starts_at);
create index idx_appointments_employee_date on appointments(employee_id, starts_at);
create index idx_appointments_customer on appointments(customer_id);

-- ----------------------------------------------------------------------------
-- SON DAKİKA BOŞLUĞU (işletmenin manuel işaretlediği öne çıkan boş slot)
-- ----------------------------------------------------------------------------
create table last_minute_slots (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BEKLEME LİSTESİ (altyapı — SMS/bildirim ileride eklenecek)
-- ----------------------------------------------------------------------------
create table waitlist_entries (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  service_id uuid references services(id) on delete cascade,
  customer_id uuid not null references customers(id),
  desired_date date not null,
  desired_time_from time,
  desired_time_to time,
  is_notified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- YORUMLAR
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  customer_id uuid not null references customers(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_reviews_business on reviews(business_id) where is_published;

-- ----------------------------------------------------------------------------
-- ABONELİKLER / ÖDEMELER (mock ödeme altyapısı — gerçek entegrasyon sonra eklenir)
-- ----------------------------------------------------------------------------
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  plan_id uuid not null references plans(id),
  amount numeric(10,2) not null,
  billing_period billing_period not null default 'monthly',
  payment_status payment_status not null default 'pending',
  subscription_status subscription_status not null default 'trial',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_subscriptions_business on subscriptions(business_id);

-- ----------------------------------------------------------------------------
-- ŞİKAYETLER (admin paneli için)
-- ----------------------------------------------------------------------------
create table complaints (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  reported_by_profile_id uuid references profiles(id) on delete set null,
  subject text not null,
  message text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at otomatik güncelleme trigger'ı
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_businesses_updated before update on businesses for each row execute function set_updated_at();
create trigger trg_services_updated before update on services for each row execute function set_updated_at();
create trigger trg_appointments_updated before update on appointments for each row execute function set_updated_at();
