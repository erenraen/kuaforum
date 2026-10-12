-- ============================================================================
-- 07_hardening.sql — Production sertleştirme turu
--
-- KRİTİK BULGU: get_available_slots() SECURITY DEFINER DEĞİLDİ. Bu fonksiyon
-- anon rolüyle çalıştığında appointments ve schedule_blocks tablolarındaki
-- RLS politikaları (sadece işletme üyesi/admin görebilir) devreye giriyor ve
-- anon için bu tablolar BOŞ görünüyordu. Sonuç: get_available_slots() DOLU
-- saatleri bile "müsait" olarak raporluyordu. book_appointment() içindeki
-- EXCLUDE constraint sayesinde gerçek bir çifte randevu OLUŞMUYORDU (o katman
-- sağlamdı), ama müşteriye yanlış/yanıltıcı müsaitlik gösteriliyor ve dolu
-- saat seçildiğinde "az önce alındı" hatasıyla karşılaşıyordu. Bu dosya bunu
-- ve ilgili tüm timezone/yetkilendirme sorunlarını düzeltir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0) Yardımcı: işletme SAHİBİ mi (staff değil)? Owner/staff yetki ayrımı için.
-- ----------------------------------------------------------------------------
create or replace function is_business_owner(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from business_members bm
    where bm.business_id = p_business_id
      and bm.profile_id = auth.uid()
      and bm.role = 'owner'
  ) or is_admin();
$$;

-- ----------------------------------------------------------------------------
-- 1) get_available_slots — SECURITY DEFINER + Europe/Istanbul TZ düzeltmesi
--    "AT TIME ZONE 'Europe/Istanbul'" kullanımı, Postgres session timezone
--    ayarından TAMAMEN bağımsız, her zaman doğru İstanbul saatine çevirir.
--    Türkiye 2016'dan beri DST uygulamıyor (sabit UTC+3), bu yüzden tzdata
--    üzerinden güvenle hesaplanabilir.
-- ----------------------------------------------------------------------------
create or replace function get_available_slots(
  p_business_id uuid,
  p_employee_id uuid,
  p_service_id uuid,
  p_date date,
  p_slot_step_minutes int default 30
)
returns table (slot_start timestamptz, slot_end timestamptz, is_available boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weekday int := extract(dow from p_date);
  v_duration int;
  v_biz_open time;
  v_biz_close time;
  v_biz_closed boolean;
  v_emp_open time;
  v_emp_close time;
  v_emp_closed boolean;
  v_open time;
  v_close time;
  v_cursor timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_now timestamptz := now();
begin
  -- business aktif değilse hiç slot gösterme (pending/suspended/rejected randevu kabul etmez)
  if not exists (select 1 from businesses where id = p_business_id and status = 'active') then
    return;
  end if;

  select duration_minutes into v_duration
  from services where id = p_service_id and business_id = p_business_id and is_active;
  if v_duration is null then
    return; -- hizmet yok/pasif → sessizce boş sonuç (hata değil, slot listesi boş)
  end if;

  if not exists (
    select 1 from employees where id = p_employee_id and business_id = p_business_id and is_active
  ) then
    return;
  end if;

  -- çalışan bu hizmeti gerçekten verebiliyor mu?
  if not exists (
    select 1 from employee_services where employee_id = p_employee_id and service_id = p_service_id
  ) then
    return;
  end if;

  select is_closed, opens_at, closes_at into v_biz_closed, v_biz_open, v_biz_close
  from business_hours where business_id = p_business_id and weekday = v_weekday;

  select is_closed, opens_at, closes_at into v_emp_closed, v_emp_open, v_emp_close
  from employee_hours where employee_id = p_employee_id and weekday = v_weekday;

  if v_biz_open is null or coalesce(v_biz_closed, true) then
    return;
  end if;

  if v_emp_open is not null and not coalesce(v_emp_closed, false) then
    v_open := greatest(v_biz_open, v_emp_open);
    v_close := least(v_biz_close, v_emp_close);
  elsif v_emp_open is not null and v_emp_closed then
    return;
  else
    v_open := v_biz_open;
    v_close := v_biz_close;
  end if;

  if v_open is null or v_close is null or v_open >= v_close then
    return;
  end if;

  -- naive timestamp'i "Europe/Istanbul" olarak yorumlayıp doğru UTC instant'a çevir
  v_day_start := (p_date + v_open) AT TIME ZONE 'Europe/Istanbul';
  v_day_end := (p_date + v_close) AT TIME ZONE 'Europe/Istanbul';
  v_cursor := v_day_start;

  while v_cursor + make_interval(mins => v_duration) <= v_day_end loop
    slot_start := v_cursor;
    slot_end := v_cursor + make_interval(mins => v_duration);

    is_available :=
      slot_start > v_now
      and not exists (
        select 1 from appointments a
        where a.employee_id = p_employee_id
          and a.status <> 'canceled'
          and tstzrange(a.starts_at, a.ends_at) && tstzrange(slot_start, slot_end)
      )
      and not exists (
        select 1 from schedule_blocks sb
        where sb.business_id = p_business_id
          and (sb.employee_id is null or sb.employee_id = p_employee_id)
          and tstzrange(sb.starts_at, sb.ends_at) && tstzrange(slot_start, slot_end)
      );

    return next;
    v_cursor := v_cursor + make_interval(mins => p_slot_step_minutes);
  end loop;

  return;
end;
$$;

grant execute on function get_available_slots to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) book_appointment — TAM server-side validasyon
--    Artık sadece "çakışma yok" değil; business aktif mi, service/employee
--    gerçekten bu business'a ait ve aktif mi, employee bu service'i verebiliyor
--    mu, çalışma saatleri içinde mi, schedule_blocks ile kapatılmış mı — HEPSİ
--    PostgreSQL seviyesinde kontrol ediliyor. Frontend'in get_available_slots
--    çağrısını hiç yapmadan, doğrudan bu RPC'yi çağırsa bile aynı kurallar
--    uygulanır.
-- ----------------------------------------------------------------------------
create or replace function book_appointment(
  p_business_id uuid,
  p_employee_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_note text default null
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_price numeric(10,2);
  v_ends_at timestamptz;
  v_customer_id uuid;
  v_new_appt appointments;
  v_weekday int;
  v_biz_open time; v_biz_close time; v_biz_closed boolean;
  v_emp_open time; v_emp_close time; v_emp_closed boolean;
  v_open time; v_close time;
  v_local_date date;
  v_local_time time;
begin
  if p_customer_name is null or length(trim(p_customer_name)) < 2 then
    raise exception 'Ad soyad gerekli.';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) < 10 then
    raise exception 'Geçerli bir telefon numarası gerekli.';
  end if;

  if p_starts_at <= now() then
    raise exception 'Geçmiş bir saate randevu oluşturulamaz.';
  end if;

  -- sadece AKTİF işletmeler randevu kabul eder (pending/suspended/rejected değil)
  if not exists (select 1 from businesses where id = p_business_id and status = 'active') then
    raise exception 'Bu işletme şu anda randevu kabul etmiyor.';
  end if;

  select duration_minutes, price into v_duration, v_price
  from services
  where id = p_service_id and business_id = p_business_id and is_active;
  if v_duration is null then
    raise exception 'Seçilen hizmet bu işletmede bulunamadı veya aktif değil.';
  end if;

  if not exists (
    select 1 from employees
    where id = p_employee_id and business_id = p_business_id and is_active
  ) then
    raise exception 'Seçilen çalışan bu işletmede bulunamadı veya aktif değil.';
  end if;

  if not exists (
    select 1 from employee_services
    where employee_id = p_employee_id and service_id = p_service_id
  ) then
    raise exception 'Seçilen çalışan bu hizmeti vermiyor.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  -- randevu saati, işletmenin/çalışanın İstanbul saatine göre çalışma saatleri içinde mi?
  v_local_date := (p_starts_at AT TIME ZONE 'Europe/Istanbul')::date;
  v_local_time := (p_starts_at AT TIME ZONE 'Europe/Istanbul')::time;
  v_weekday := extract(dow from v_local_date);

  select is_closed, opens_at, closes_at into v_biz_closed, v_biz_open, v_biz_close
  from business_hours where business_id = p_business_id and weekday = v_weekday;

  if v_biz_open is null or coalesce(v_biz_closed, true) then
    raise exception 'İşletme bu gün kapalı.';
  end if;

  select is_closed, opens_at, closes_at into v_emp_closed, v_emp_open, v_emp_close
  from employee_hours where employee_id = p_employee_id and weekday = v_weekday;

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
    where sb.business_id = p_business_id
      and (sb.employee_id is null or sb.employee_id = p_employee_id)
      and tstzrange(sb.starts_at, sb.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'Seçilen saat kapatılmış.';
  end if;

  select id into v_customer_id from customers where phone = p_customer_phone order by created_at desc limit 1;
  if v_customer_id is null then
    insert into customers (full_name, phone) values (p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- son savunma hattı: EXCLUDE constraint, eşzamanlı iki isteği de kesin engeller
  insert into appointments (
    business_id, employee_id, service_id, customer_id,
    starts_at, ends_at, status, note, price_at_booking
  ) values (
    p_business_id, p_employee_id, p_service_id, v_customer_id,
    p_starts_at, v_ends_at, 'pending', p_note, v_price
  )
  returning * into v_new_appt;

  return v_new_appt;
exception
  when exclusion_violation then
    raise exception 'Bu saat az önce başka bir müşteri tarafından alındı. Lütfen başka bir saat seçin.';
end;
$$;

grant execute on function book_appointment to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) book_appointment_manual — değişmedi (book_appointment'ı sarmalıyor),
--    ama artık yukarıdaki tüm yeni kontrolleri otomatik devralıyor.
-- ----------------------------------------------------------------------------
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
  return v_result;
end;
$$;

grant execute on function book_appointment_manual to authenticated;

-- ----------------------------------------------------------------------------
-- 4) create_last_minute_slot — aynı tam validasyon seti son dakika slotu için
-- ----------------------------------------------------------------------------
create or replace function create_last_minute_slot(
  p_business_id uuid,
  p_employee_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz
)
returns last_minute_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duration int;
  v_ends_at timestamptz;
  v_result last_minute_slots;
begin
  if not is_business_member(p_business_id) then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  if p_starts_at <= now() then
    raise exception 'Geçmiş bir saat için son dakika ilanı oluşturulamaz.';
  end if;

  if not exists (select 1 from businesses where id = p_business_id and status = 'active') then
    raise exception 'İşletme aktif değil.';
  end if;

  select duration_minutes into v_duration
  from services where id = p_service_id and business_id = p_business_id and is_active;
  if v_duration is null then
    raise exception 'Hizmet bulunamadı veya aktif değil.';
  end if;

  if not exists (select 1 from employees where id = p_employee_id and business_id = p_business_id and is_active) then
    raise exception 'Çalışan bulunamadı veya aktif değil.';
  end if;

  if not exists (select 1 from employee_services where employee_id = p_employee_id and service_id = p_service_id) then
    raise exception 'Seçilen çalışan bu hizmeti vermiyor.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  if exists (
    select 1 from appointments a
    where a.employee_id = p_employee_id
      and a.status <> 'canceled'
      and tstzrange(a.starts_at, a.ends_at) && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'Bu saatte zaten bir randevu var.';
  end if;

  insert into last_minute_slots (business_id, employee_id, service_id, starts_at, ends_at)
  values (p_business_id, p_employee_id, p_service_id, p_starts_at, v_ends_at)
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function create_last_minute_slot to authenticated;

-- ----------------------------------------------------------------------------
-- 4b) get_earliest_slot_today — bir işletme listesi için (keşif/ana sayfa
--     kartlarında) her işletmenin bugünkü EN ERKEN müsait randevu saatini
--     TEK bir RPC çağrısıyla (N+1 yok) hesaplar. 15 dakikalık adımlarla arar
--     (performans/hassasiyet dengesi) — hizmetin kendi süresine göre slot
--     bitişini doğru hesaplar.
-- ----------------------------------------------------------------------------
create or replace function get_earliest_slot_today(p_business_ids uuid[])
returns table (business_id uuid, earliest_slot timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_biz uuid;
  v_today date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_weekday int := extract(dow from v_today);
  v_emp record;
  v_svc record;
  v_open time; v_close time;
  v_cursor timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_best timestamptz;
  v_found timestamptz;
  v_step interval := interval '15 min';
begin
  foreach v_biz in array p_business_ids loop
    v_best := null;

    for v_emp in
      select e.id as employee_id from employees e
      where e.business_id = v_biz and e.is_active
    loop
      select
        case when eh.opens_at is not null and not coalesce(eh.is_closed, false)
          then greatest(bh.opens_at, eh.opens_at) else bh.opens_at end,
        case when eh.closes_at is not null and not coalesce(eh.is_closed, false)
          then least(bh.closes_at, eh.closes_at) else bh.closes_at end
      into v_open, v_close
      from business_hours bh
      left join employee_hours eh on eh.employee_id = v_emp.employee_id and eh.weekday = v_weekday
      where bh.business_id = v_biz and bh.weekday = v_weekday and not coalesce(bh.is_closed, true)
        and (eh.id is null or not coalesce(eh.is_closed, false));

      if v_open is null or v_close is null or v_open >= v_close then
        continue;
      end if;

      v_day_start := (v_today + v_open) AT TIME ZONE 'Europe/Istanbul';
      v_day_end := (v_today + v_close) AT TIME ZONE 'Europe/Istanbul';

      -- zaten bulunan en iyi sonuçtan daha geç bir çalışanı aramaya gerek yok
      if v_best is not null and v_day_start >= v_best then
        continue;
      end if;

      for v_svc in
        select s.id as service_id, s.duration_minutes
        from services s
        join employee_services es on es.service_id = s.id and es.employee_id = v_emp.employee_id
        where s.business_id = v_biz and s.is_active
        order by s.duration_minutes asc
      loop
        v_cursor := greatest(v_day_start, now());
        -- step'e hizala (şimdiki zamandan sonraki ilk 15dk sınırı)
        v_cursor := v_day_start + ceil(extract(epoch from (v_cursor - v_day_start)) / extract(epoch from v_step)) * v_step;

        v_found := null;
        while v_cursor + make_interval(mins => v_svc.duration_minutes) <= v_day_end loop
          if (v_best is null or v_cursor < v_best)
            and not exists (
              select 1 from appointments a
              where a.employee_id = v_emp.employee_id and a.status <> 'canceled'
                and tstzrange(a.starts_at, a.ends_at) && tstzrange(v_cursor, v_cursor + make_interval(mins => v_svc.duration_minutes))
            )
            and not exists (
              select 1 from schedule_blocks sb
              where sb.business_id = v_biz and (sb.employee_id is null or sb.employee_id = v_emp.employee_id)
                and tstzrange(sb.starts_at, sb.ends_at) && tstzrange(v_cursor, v_cursor + make_interval(mins => v_svc.duration_minutes))
            )
          then
            v_found := v_cursor;
            exit;
          end if;
          v_cursor := v_cursor + v_step;
        end loop;

        if v_found is not null and (v_best is null or v_found < v_best) then
          v_best := v_found;
        end if;
      end loop;
    end loop;

    if v_best is not null then
      business_id := v_biz;
      earliest_slot := v_best;
      return next;
    end if;
  end loop;
  return;
end;
$$;

grant execute on function get_earliest_slot_today to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) increment_business_view — profil görüntülenme sayacı (atomic, RLS-safe)
--    Önceki kod anon context'inde doğrudan UPDATE deniyordu; businesses tablosu
--    update RLS politikası is_business_member() istediği için anon ziyaretçide
--    SESSİZCE başarısız oluyordu (sayaç hiç artmıyordu). Artık RPC üzerinden.
-- ----------------------------------------------------------------------------
create or replace function increment_business_view(p_business_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update businesses
  set profile_view_count = profile_view_count + 1
  where id = p_business_id and status = 'active';
$$;

grant execute on function increment_business_view to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) expire_trial_if_needed — trial süresi dolmuş işletmeleri 'expired' yapar.
--    Gerçek bir cron job bu projede yok; bu yüzden ilgili sayfalar (dashboard,
--    paket sayfası) her yüklendiğinde bu fonksiyonu idempotent şekilde çağırır.
--    Bu bilinçli bir MVP kısıtıdır (bkz. final rapor, madde F).
-- ----------------------------------------------------------------------------
create or replace function expire_trial_if_needed(p_business_id uuid)
returns subscription_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status subscription_status;
begin
  update businesses
  set subscription_status = 'expired'
  where id = p_business_id
    and subscription_status = 'trial'
    and trial_ends_at is not null
    and trial_ends_at < now();

  select subscription_status into v_status from businesses where id = p_business_id;
  return v_status;
end;
$$;

grant execute on function expire_trial_if_needed to authenticated;

-- ----------------------------------------------------------------------------
-- 7) PUBLIC GÖRÜNÜRLÜK: sadece 'active' işletmeler anonim kullanıcıya görünür.
--    'pending' artık keşif/profil sayfasında herkese açık DEĞİL — sadece
--    işletmenin kendi üyeleri ve admin onboarding sürecinde görebilir.
-- ----------------------------------------------------------------------------
drop policy if exists "businesses_public_read" on businesses;
create policy "businesses_public_read" on businesses
  for select using (status = 'active' or is_business_member(id) or is_admin());

-- ----------------------------------------------------------------------------
-- 8) OWNER / STAFF AYRIMI: yapısal/finansal alanlar sadece owner tarafından
--    değiştirilebilir (frontend kontrolüne güvenmeden, RLS seviyesinde).
--    Randevu/takvim/son-dakika gibi günlük operasyonlar staff'a da açık kalır.
-- ----------------------------------------------------------------------------
drop policy if exists "businesses_member_update" on businesses;
create policy "businesses_owner_update" on businesses
  for update using (is_business_owner(id) or is_admin());

drop policy if exists "services_member_write" on services;
create policy "services_owner_write" on services for all
  using (is_business_owner(business_id)) with check (is_business_owner(business_id));

drop policy if exists "employees_member_write" on employees;
create policy "employees_owner_write" on employees for all
  using (is_business_owner(business_id)) with check (is_business_owner(business_id));

drop policy if exists "employee_services_member_write" on employee_services;
create policy "employee_services_owner_write" on employee_services for all
  using (exists (select 1 from employees e where e.id = employee_id and is_business_owner(e.business_id)))
  with check (exists (select 1 from employees e where e.id = employee_id and is_business_owner(e.business_id)));

drop policy if exists "business_hours_member_write" on business_hours;
create policy "business_hours_owner_write" on business_hours for all
  using (is_business_owner(business_id)) with check (is_business_owner(business_id));

drop policy if exists "employee_hours_member_write" on employee_hours;
create policy "employee_hours_owner_write" on employee_hours for all
  using (exists (select 1 from employees e where e.id = employee_id and is_business_owner(e.business_id)))
  with check (exists (select 1 from employees e where e.id = employee_id and is_business_owner(e.business_id)));

drop policy if exists "photos_member_write" on business_photos;
create policy "photos_owner_write" on business_photos for all
  using (is_business_owner(business_id)) with check (is_business_owner(business_id));

-- Not: appointments, last_minute_slots, schedule_blocks politikaları bilinçli
-- olarak is_business_member() ile KALIYOR — gün içi operasyonlar (randevu
-- onaylama, takvim yönetimi, son dakika ilanı) staff rolüne de açık olmalı.

-- ----------------------------------------------------------------------------
-- 9) WAITLIST / COMPLAINTS — sınırsız anon insert spam/abuse riskini azalt.
--    Tam bir rate-limit RLS ile yapılamaz (bu Postgres'in işi değil, bir
--    API gateway/edge function işi) ama en azından hedef işletmenin gerçekten
--    var ve aktif olmasını zorunlu kılıyoruz.
-- ----------------------------------------------------------------------------
drop policy if exists "waitlist_insert" on waitlist_entries;
create policy "waitlist_insert" on waitlist_entries for insert
  with check (exists (select 1 from businesses b where b.id = business_id and b.status = 'active'));

drop policy if exists "complaints_insert" on complaints;
create policy "complaints_insert" on complaints for insert
  with check (
    (business_id is null or exists (select 1 from businesses b where b.id = business_id))
    and length(trim(message)) between 5 and 2000
  );
