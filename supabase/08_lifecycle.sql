-- ============================================================================
-- 08_lifecycle.sql — Randevu yaşam döngüsü + ödeme/QR/bekleme listesi altyapısı
-- Mevcut appointments/customers/employees/services/businesses şemasını BOZMAZ,
-- üzerine inşa eder. Sırayla 01 → 07'den sonra çalıştırılmalı.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) GEÇERSİZ STATUS GEÇİŞLERİNİ ENGELLE
--    completed/canceled/no_show TERMİNAL durumlardır — bunlardan başka bir
--    duruma geçiş yapılamaz. Bu kontrol frontend'de değil, DB trigger'ında.
-- ----------------------------------------------------------------------------
create or replace function enforce_appointment_status_transition()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  if new.status = old.status then
    return new; -- no-op güncellemeye izin ver (idempotent)
  end if;

  v_allowed := case old.status
    when 'pending'   then new.status in ('confirmed', 'canceled', 'completed', 'no_show')
    when 'confirmed' then new.status in ('completed', 'canceled', 'no_show')
    when 'completed' then false
    when 'canceled'  then false
    when 'no_show'   then false
    else false
  end;

  if not v_allowed then
    raise exception 'Geçersiz randevu durumu geçişi: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointment_status_transition on appointments;
create trigger trg_appointment_status_transition
before update of status on appointments
for each row execute function enforce_appointment_status_transition();

-- ----------------------------------------------------------------------------
-- 2) RANDEVU OLAY GÜNLÜĞÜ (audit) — kim, ne zaman, ne değişti
-- ----------------------------------------------------------------------------
create table appointment_events (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  event_type text not null, -- 'created' | 'status_changed' | 'rescheduled'
  actor_type text not null, -- 'customer' | 'business' | 'admin' | 'system'
  old_status appointment_status,
  new_status appointment_status,
  old_starts_at timestamptz,
  new_starts_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index idx_appointment_events_appt on appointment_events(appointment_id, created_at desc);

alter table appointment_events enable row level security;

create policy "appointment_events_select" on appointment_events
  for select using (
    is_admin()
    or exists (select 1 from appointments a where a.id = appointment_id and is_business_member(a.business_id))
  );

-- yazma yalnızca SECURITY DEFINER fonksiyonlar üzerinden (aşağıda) yapılır
create policy "appointment_events_admin_insert" on appointment_events
  for insert with check (is_admin());

-- status değişince otomatik event logla (hangi aktör olduğunu bilemeyiz, bu
-- yüzden trigger 'system' olarak loglar; müşteri/işletme aksiyonlu olanlar
-- ilgili RPC'ler içinde ayrıca, doğru actor_type ile de loglanır)
create or replace function log_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into appointment_events (appointment_id, event_type, actor_type, old_status, new_status)
    values (new.id, 'status_changed', 'business', old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_appointment_status on appointments;
create trigger trg_log_appointment_status
after update of status on appointments
for each row execute function log_appointment_status_change();

create or replace function log_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into appointment_events (appointment_id, event_type, actor_type, new_status, new_starts_at)
  values (new.id, 'created', case when new.is_manual then 'business' else 'customer' end, new.status, new.starts_at);
  return new;
end;
$$;

drop trigger if exists trg_log_appointment_created on appointments;
create trigger trg_log_appointment_created
after insert on appointments
for each row execute function log_appointment_created();

-- book_appointment_manual INSERT anında is_manual henüz false olduğu için
-- yukarıdaki trigger actor_type'ı yanlışlıkla 'customer' yazar; bu yeniden
-- tanım (07_hardening.sql'deki ile aynı mantık + audit düzeltmesi) onu giderir.
create or replace function book_appointment_manual(
  p_business_id uuid,
  p_employee_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_note text default null,
  p_status appointment_status default 'confirmed'
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result appointments;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  v_result := book_appointment(p_business_id, p_employee_id, p_service_id, p_starts_at, p_customer_name, p_customer_phone, p_note);
  update appointments set status = p_status, is_manual = true where id = v_result.id returning * into v_result;

  update appointment_events
  set actor_type = 'business'
  where appointment_id = v_result.id and event_type = 'created';

  return v_result;
end;
$$;

grant execute on function book_appointment_manual to authenticated;

-- ----------------------------------------------------------------------------
-- 3) MÜŞTERİ İPTAL / YENİDEN PLANLAMA
--    Aynı güvenlik deseni: randevu id + telefon eşleşmesi (bkz. submit_review).
-- ----------------------------------------------------------------------------
create or replace function cancel_appointment(
  p_appointment_id uuid,
  p_customer_phone text
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_phone text;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  select phone into v_phone from customers where id = v_appt.customer_id;
  if v_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Bu randevu artık iptal edilemez.';
  end if;

  update appointments set status = 'canceled' where id = p_appointment_id returning * into v_appt;

  insert into appointment_events (appointment_id, event_type, actor_type, old_status, new_status)
  values (p_appointment_id, 'status_changed', 'customer', 'pending', 'canceled');

  return v_appt;
end;
$$;

grant execute on function cancel_appointment to anon, authenticated;

create or replace function reschedule_appointment(
  p_appointment_id uuid,
  p_customer_phone text,
  p_new_starts_at timestamptz
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_phone text;
  v_old_starts_at timestamptz;
  v_duration int;
  v_new_ends_at timestamptz;
  v_weekday int;
  v_biz_open time; v_biz_close time; v_biz_closed boolean;
  v_emp_open time; v_emp_close time; v_emp_closed boolean;
  v_open time; v_close time;
  v_local_date date;
  v_local_time time;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  select phone into v_phone from customers where id = v_appt.customer_id;
  if v_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Bu randevu artık yeniden planlanamaz.';
  end if;

  if p_new_starts_at <= now() then
    raise exception 'Geçmiş bir saate randevu planlanamaz.';
  end if;

  select duration_minutes into v_duration from services where id = v_appt.service_id;
  v_new_ends_at := p_new_starts_at + make_interval(mins => v_duration);

  -- aynı tam doğrulama seti (çalışma saatleri + blok) book_appointment ile aynı mantık
  v_local_date := (p_new_starts_at AT TIME ZONE 'Europe/Istanbul')::date;
  v_local_time := (p_new_starts_at AT TIME ZONE 'Europe/Istanbul')::time;
  v_weekday := extract(dow from v_local_date);

  select is_closed, opens_at, closes_at into v_biz_closed, v_biz_open, v_biz_close
  from business_hours where business_id = v_appt.business_id and weekday = v_weekday;
  if v_biz_open is null or coalesce(v_biz_closed, true) then
    raise exception 'İşletme bu gün kapalı.';
  end if;

  select is_closed, opens_at, closes_at into v_emp_closed, v_emp_open, v_emp_close
  from employee_hours where employee_id = v_appt.employee_id and weekday = v_weekday;
  if v_emp_open is not null and not coalesce(v_emp_closed, false) then
    v_open := greatest(v_biz_open, v_emp_open);
    v_close := least(v_biz_close, v_emp_close);
  elsif v_emp_open is not null and v_emp_closed then
    raise exception 'Seçilen çalışan bu gün izinli.';
  else
    v_open := v_biz_open;
    v_close := v_biz_close;
  end if;

  if v_local_time < v_open or (v_local_time + make_interval(mins => v_duration)) > v_close then
    raise exception 'Seçilen saat çalışma saatleri dışında.';
  end if;

  if exists (
    select 1 from schedule_blocks sb
    where sb.business_id = v_appt.business_id
      and (sb.employee_id is null or sb.employee_id = v_appt.employee_id)
      and tstzrange(sb.starts_at, sb.ends_at) && tstzrange(p_new_starts_at, v_new_ends_at)
  ) then
    raise exception 'Seçilen saat kapatılmış.';
  end if;

  v_old_starts_at := v_appt.starts_at;

  -- EXCLUDE constraint eşzamanlı çakışmayı yine de garanti eder
  begin
    update appointments
    set starts_at = p_new_starts_at, ends_at = v_new_ends_at, status = 'pending'
    where id = p_appointment_id
    returning * into v_appt;
  exception
    when exclusion_violation then
      raise exception 'Bu saat az önce başka bir müşteri tarafından alındı. Lütfen başka bir saat seçin.';
  end;

  insert into appointment_events (appointment_id, event_type, actor_type, old_starts_at, new_starts_at)
  values (p_appointment_id, 'rescheduled', 'customer', v_old_starts_at, p_new_starts_at);

  return v_appt;
end;
$$;

grant execute on function reschedule_appointment to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) SON DAKİKA SLOTU — gerçek randevuyla çakışırsa otomatik kapanır
-- ----------------------------------------------------------------------------
create or replace function deactivate_overlapping_last_minute_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'canceled' then
    update last_minute_slots
    set is_active = false
    where employee_id = new.employee_id
      and is_active
      and tstzrange(starts_at, ends_at) && tstzrange(new.starts_at, new.ends_at);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deactivate_last_minute on appointments;
create trigger trg_deactivate_last_minute
after insert or update of starts_at, ends_at, status on appointments
for each row execute function deactivate_overlapping_last_minute_slots();

-- ----------------------------------------------------------------------------
-- 5) BEKLEME LİSTESİ — müşteri katılabilir, işletme uygun kayıtları görebilir
-- ----------------------------------------------------------------------------
create or replace function join_waitlist(
  p_business_id uuid,
  p_employee_id uuid,
  p_service_id uuid,
  p_desired_date date,
  p_customer_name text,
  p_customer_phone text
)
returns waitlist_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_result waitlist_entries;
begin
  if not exists (select 1 from businesses where id = p_business_id and status = 'active') then
    raise exception 'İşletme aktif değil.';
  end if;
  if not exists (select 1 from services where id = p_service_id and business_id = p_business_id and is_active) then
    raise exception 'Hizmet bulunamadı.';
  end if;
  if not exists (select 1 from employees where id = p_employee_id and business_id = p_business_id and is_active) then
    raise exception 'Çalışan bulunamadı.';
  end if;

  select id into v_customer_id from customers where phone = p_customer_phone order by created_at desc limit 1;
  if v_customer_id is null then
    insert into customers (full_name, phone) values (p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  insert into waitlist_entries (business_id, employee_id, service_id, customer_id, desired_date)
  values (p_business_id, p_employee_id, p_service_id, v_customer_id, p_desired_date)
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function join_waitlist to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) ÖDEME ALTYAPISI (henüz hiçbir UI bunu "ödeme başarılı" gibi göstermez —
--    sadece gerçek bir sağlayıcı bağlanınca kullanılacak şema + RPC hazır)
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id),
  amount numeric(10,2) not null,
  currency text not null default 'TRY',
  status payment_status not null default 'pending',
  provider text not null default 'mock',
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payments_appointment on payments(appointment_id);
create index idx_payments_business on payments(business_id);

create trigger trg_payments_updated before update on payments for each row execute function set_updated_at();

alter table payments enable row level security;
create policy "payments_select" on payments
  for select using (
    is_business_member(business_id) or is_admin()
    or exists (select 1 from customers c where c.id = customer_id and c.profile_id = auth.uid())
  );
create policy "payments_admin_write" on payments for all using (is_admin()) with check (is_admin());

-- Fiyatı FRONTEND'den almaz; appointment'ın price_at_booking alanından okur.
create or replace function create_pending_payment(p_appointment_id uuid)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_result payments;
begin
  if not is_business_member((select business_id from appointments where id = p_appointment_id)) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  insert into payments (appointment_id, business_id, customer_id, amount, status, provider)
  values (v_appt.id, v_appt.business_id, v_appt.customer_id, v_appt.price_at_booking, 'pending', 'mock')
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function create_pending_payment to authenticated;

-- ----------------------------------------------------------------------------
-- 7) QR CHECK-IN — tahmin edilemez, süreli, tek kullanımlık token
-- ----------------------------------------------------------------------------
create table appointment_checkins (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  token text not null unique,
  status text not null default 'active', -- 'active' | 'scanned' | 'expired'
  expires_at timestamptz not null,
  scanned_at timestamptz,
  scanned_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_checkins_token on appointment_checkins(token);

alter table appointment_checkins enable row level security;
create policy "checkins_select" on appointment_checkins
  for select using (is_business_member(business_id) or is_admin());
create policy "checkins_admin_write" on appointment_checkins for all using (is_admin()) with check (is_admin());

create or replace function generate_checkin_token(
  p_appointment_id uuid,
  p_customer_phone text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_phone text;
  v_token text;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  select phone into v_phone from customers where id = v_appt.customer_id;
  if v_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  if v_appt.status not in ('pending', 'confirmed') then
    raise exception 'Bu randevu için check-in oluşturulamaz.';
  end if;

  -- varsa eski aktif token'ı geçersiz kıl, tahmin edilemez yeni token üret
  update appointment_checkins set status = 'expired'
  where appointment_id = p_appointment_id and status = 'active';

  v_token := 'KFR-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));

  insert into appointment_checkins (appointment_id, business_id, token, expires_at)
  values (v_appt.id, v_appt.business_id, v_token, v_appt.ends_at + interval '2 hours');

  return v_token;
end;
$$;

grant execute on function generate_checkin_token to anon, authenticated;

create or replace function redeem_checkin_token(p_token text)
returns table (
  appointment_id uuid,
  customer_name text,
  service_name text,
  starts_at timestamptz,
  already_scanned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkin appointment_checkins;
begin
  select * into v_checkin from appointment_checkins where token = p_token;
  if v_checkin.id is null then
    raise exception 'Geçersiz kod.';
  end if;

  if not is_business_member(v_checkin.business_id) then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  if v_checkin.expires_at < now() then
    update appointment_checkins set status = 'expired' where id = v_checkin.id;
    raise exception 'Bu kodun süresi dolmuş.';
  end if;

  if v_checkin.status = 'scanned' then
    -- ikinci kez okutulursa hata vermek yerine "zaten kullanıldı" bilgisini dön
    return query
      select a.id, c.full_name, s.name, a.starts_at, true
      from appointments a
      join customers c on c.id = a.customer_id
      join services s on s.id = a.service_id
      where a.id = v_checkin.appointment_id;
    return;
  end if;

  update appointment_checkins
  set status = 'scanned', scanned_at = now(), scanned_by = auth.uid()
  where id = v_checkin.id;

  return query
    select a.id, c.full_name, s.name, a.starts_at, false
    from appointments a
    join customers c on c.id = a.customer_id
    join services s on s.id = a.service_id
    where a.id = v_checkin.appointment_id;
end;
$$;

grant execute on function redeem_checkin_token to authenticated;
