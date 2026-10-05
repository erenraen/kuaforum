-- ============================================================================
-- ROW LEVEL SECURITY POLİTİKALARI
-- Kural: bir işletme başka bir işletmenin müşterisini, randevusunu, finans
-- bilgisini ve çalışanını göremez. Admin her şeye erişir. Herkese açık keşif
-- verileri (işletme profili, hizmetler, saatler) anonim kullanıcıya da açıktır.
-- ============================================================================

alter table profiles enable row level security;
alter table cities enable row level security;
alter table districts enable row level security;
alter table categories enable row level security;
alter table plans enable row level security;
alter table businesses enable row level security;
alter table business_members enable row level security;
alter table business_photos enable row level security;
alter table employees enable row level security;
alter table services enable row level security;
alter table employee_services enable row level security;
alter table business_hours enable row level security;
alter table employee_hours enable row level security;
alter table schedule_blocks enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table last_minute_slots enable row level security;
alter table waitlist_entries enable row level security;
alter table reviews enable row level security;
alter table subscriptions enable row level security;
alter table complaints enable row level security;

-- ----------------------------------------------------------------------------
-- Yardımcı fonksiyon: çağıran kullanıcı admin mi?
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Yardımcı fonksiyon: çağıran kullanıcı bu işletmenin üyesi mi (owner/staff)?
create or replace function is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members bm
    where bm.business_id = p_business_id and bm.profile_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- PROFILES: herkes kendi profilini görür/günceller. Admin herkesi görür.
-- ----------------------------------------------------------------------------
create policy "profiles_select_own" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- CITIES / DISTRICTS / CATEGORIES / PLANS: herkese açık okuma, sadece admin yazar
-- ----------------------------------------------------------------------------
create policy "cities_public_read" on cities for select using (true);
create policy "cities_admin_write" on cities for all using (is_admin()) with check (is_admin());

create policy "districts_public_read" on districts for select using (true);
create policy "districts_admin_write" on districts for all using (is_admin()) with check (is_admin());

create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

create policy "plans_public_read" on plans for select using (is_active or is_admin());
create policy "plans_admin_write" on plans for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- BUSINESSES: aktif/pending işletmeler herkese açık görünür (keşif sayfası için).
-- Finansal olmayan profil alanları herkese açık; sadece üye/admin güncelleyebilir.
-- ----------------------------------------------------------------------------
create policy "businesses_public_read" on businesses
  for select using (status in ('active', 'pending') or is_business_member(id) or is_admin());

create policy "businesses_member_update" on businesses
  for update using (is_business_member(id) or is_admin());

create policy "businesses_admin_insert" on businesses
  for insert with check (is_admin() or owner_id = auth.uid());

create policy "businesses_admin_delete" on businesses
  for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- BUSINESS_MEMBERS: sadece kendi üyeliklerini ve işletmesindeki diğer üyeleri görür
-- ----------------------------------------------------------------------------
create policy "members_select" on business_members
  for select using (profile_id = auth.uid() or is_business_member(business_id) or is_admin());
create policy "members_write" on business_members
  for all using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- BUSINESS_PHOTOS / EMPLOYEES / SERVICES / EMPLOYEE_SERVICES / HOURS:
-- herkese açık okuma (keşif+detay sayfası), sadece o işletmenin üyesi yazar
-- ----------------------------------------------------------------------------
create policy "photos_public_read" on business_photos for select using (true);
create policy "photos_member_write" on business_photos for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

create policy "employees_public_read" on employees for select using (true);
create policy "employees_member_write" on employees for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

create policy "services_public_read" on services for select using (true);
create policy "services_member_write" on services for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

create policy "employee_services_public_read" on employee_services for select using (true);
create policy "employee_services_member_write" on employee_services for all
  using (exists (select 1 from employees e where e.id = employee_id and is_business_member(e.business_id)) or is_admin())
  with check (exists (select 1 from employees e where e.id = employee_id and is_business_member(e.business_id)) or is_admin());

create policy "business_hours_public_read" on business_hours for select using (true);
create policy "business_hours_member_write" on business_hours for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

create policy "employee_hours_public_read" on employee_hours for select using (true);
create policy "employee_hours_member_write" on employee_hours for all
  using (exists (select 1 from employees e where e.id = employee_id and is_business_member(e.business_id)) or is_admin())
  with check (exists (select 1 from employees e where e.id = employee_id and is_business_member(e.business_id)) or is_admin());

create policy "schedule_blocks_member_read" on schedule_blocks for select
  using (is_business_member(business_id) or is_admin());
create policy "schedule_blocks_member_write" on schedule_blocks for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- CUSTOMERS: KİŞİSEL VERİ — hiçbir işletme başka işletmenin müşterisini göremez.
-- Sadece: (a) o müşterinin kendi profiline bağlıysa kendisi, (b) o müşteriyle
-- randevusu olan işletmenin üyeleri, (c) admin görebilir. Yazma sadece
-- SECURITY DEFINER fonksiyonlar (book_appointment) üzerinden yapılır.
-- ----------------------------------------------------------------------------
create policy "customers_select_restricted" on customers
  for select using (
    profile_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from appointments a
      where a.customer_id = customers.id and is_business_member(a.business_id)
    )
  );

-- doğrudan insert/update yasak (yalnızca book_appointment SECURITY DEFINER ile yazar)
create policy "customers_no_direct_write" on customers for insert with check (is_admin());
create policy "customers_no_direct_update" on customers for update using (is_admin());

-- ----------------------------------------------------------------------------
-- APPOINTMENTS: sadece ilgili işletmenin üyeleri ve randevu sahibi müşteri görebilir.
-- Bir işletme ASLA başka işletmenin randevusunu göremez.
-- ----------------------------------------------------------------------------
create policy "appointments_select_restricted" on appointments
  for select using (
    is_business_member(business_id)
    or is_admin()
    or exists (select 1 from customers c where c.id = customer_id and c.profile_id = auth.uid())
  );

create policy "appointments_member_update" on appointments
  for update using (is_business_member(business_id) or is_admin());

-- doğrudan insert yasak — sadece book_appointment() fonksiyonu (SECURITY DEFINER) yazabilir
create policy "appointments_no_direct_insert" on appointments for insert with check (is_admin());
create policy "appointments_member_delete" on appointments for delete using (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- LAST_MINUTE_SLOTS: herkese açık okuma (ana sayfada gösterim), üye yazar
-- ----------------------------------------------------------------------------
create policy "lastmin_public_read" on last_minute_slots for select using (is_active);
create policy "lastmin_member_all" on last_minute_slots for all
  using (is_business_member(business_id) or is_admin()) with check (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- WAITLIST_ENTRIES: müşterinin kendisi ve ilgili işletme görür
-- ----------------------------------------------------------------------------
create policy "waitlist_select" on waitlist_entries
  for select using (
    is_business_member(business_id) or is_admin()
    or exists (select 1 from customers c where c.id = customer_id and c.profile_id = auth.uid())
  );
create policy "waitlist_insert" on waitlist_entries for insert with check (true);
create policy "waitlist_member_update" on waitlist_entries for update using (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- REVIEWS: herkese açık okuma (yayınlanmışlar), yazan müşteri + admin yazabilir
-- ----------------------------------------------------------------------------
create policy "reviews_public_read" on reviews for select using (is_published or is_admin() or is_business_member(business_id));
create policy "reviews_insert" on reviews for insert with check (
  exists (select 1 from customers c where c.id = customer_id and c.profile_id = auth.uid())
);
create policy "reviews_business_respond" on reviews for update using (is_business_member(business_id) or is_admin());

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS: FİNANSAL VERİ — sadece o işletmenin üyeleri kendi kayıtlarını,
-- admin tüm kayıtları görebilir. Bir işletme başka işletmenin ödeme bilgisini göremez.
-- ----------------------------------------------------------------------------
create policy "subscriptions_select_restricted" on subscriptions
  for select using (is_business_member(business_id) or is_admin());
create policy "subscriptions_admin_write" on subscriptions
  for all using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- COMPLAINTS: sadece admin ve ilgili işletme görür
-- ----------------------------------------------------------------------------
create policy "complaints_select" on complaints
  for select using (is_admin() or is_business_member(business_id));
create policy "complaints_insert" on complaints for insert with check (true);
create policy "complaints_admin_update" on complaints for update using (is_admin());
