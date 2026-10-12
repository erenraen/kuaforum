-- ============================================================================
-- RANDEVU MOTORU FONKSİYONLARI
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Yeni işletme oluşturulunca 3 günlük deneme süresi otomatik başlar
-- ----------------------------------------------------------------------------
create or replace function trg_set_trial_period()
returns trigger language plpgsql as $$
begin
  if new.trial_started_at is null then
    new.trial_started_at := now();
    new.trial_ends_at := now() + interval '3 days';
    new.subscription_status := 'trial';
  end if;

  if new.short_code is null then
    new.short_code := lower(substr(regexp_replace(new.slug, '[^a-zA-Z0-9]', '', 'g'), 1, 20));
  end if;

  return new;
end;
$$;

create trigger trg_businesses_trial
before insert on businesses
for each row execute function trg_set_trial_period();

-- ----------------------------------------------------------------------------
-- 2) Yorum eklenince işletmenin ortalama puanı otomatik güncellenir
-- ----------------------------------------------------------------------------
create or replace function trg_update_business_rating()
returns trigger language plpgsql as $$
declare
  v_business_id uuid;
begin
  v_business_id := coalesce(new.business_id, old.business_id);

  update businesses b
  set rating_avg = coalesce((
        select round(avg(r.rating)::numeric, 1)
        from reviews r
        where r.business_id = v_business_id and r.is_published
      ), 0),
      rating_count = (
        select count(*) from reviews r
        where r.business_id = v_business_id and r.is_published
      )
  where b.id = v_business_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_reviews_rating
after insert or update or delete on reviews
for each row execute function trg_update_business_rating();

-- ----------------------------------------------------------------------------
-- 3) Belirli bir çalışan + hizmet + gün için MÜSAİT slotları hesaplar.
--    - business_hours / employee_hours kesişimini alır
--    - mevcut randevuları ve schedule_blocks'u çıkarır
--    - hizmet süresine göre slot üretir (varsayılan adım: 30 dk, servis süresine bölünebilir)
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
begin
  select duration_minutes into v_duration from services where id = p_service_id and business_id = p_business_id;
  if v_duration is null then
    raise exception 'Hizmet bulunamadı';
  end if;

  select is_closed, opens_at, closes_at into v_biz_closed, v_biz_open, v_biz_close
  from business_hours where business_id = p_business_id and weekday = v_weekday;

  select is_closed, opens_at, closes_at into v_emp_closed, v_emp_open, v_emp_close
  from employee_hours where employee_id = p_employee_id and weekday = v_weekday;

  -- işletme saatleri tanımlı değilse veya kapalıysa hiç slot yok
  if v_biz_open is null or coalesce(v_biz_closed, true) then
    return;
  end if;

  -- çalışan için özel saat tanımlıysa onu kullan, yoksa işletme saatini kullan
  if v_emp_open is not null and not coalesce(v_emp_closed, false) then
    v_open := greatest(v_biz_open, v_emp_open);
    v_close := least(v_biz_close, v_emp_close);
  elsif v_emp_open is not null and v_emp_closed then
    return; -- çalışan o gün izinli
  else
    v_open := v_biz_open;
    v_close := v_biz_close;
  end if;

  if v_open is null or v_close is null or v_open >= v_close then
    return;
  end if;

  v_day_start := (p_date::text || ' ' || v_open::text)::timestamptz;
  v_day_end := (p_date::text || ' ' || v_close::text)::timestamptz;
  v_cursor := v_day_start;

  while v_cursor + make_interval(mins => v_duration) <= v_day_end loop
    slot_start := v_cursor;
    slot_end := v_cursor + make_interval(mins => v_duration);

    is_available :=
      -- geçmiş saat değilse
      slot_start > now()
      -- mevcut bir randevuyla çakışmıyorsa
      and not exists (
        select 1 from appointments a
        where a.employee_id = p_employee_id
          and a.status <> 'canceled'
          and tstzrange(a.starts_at, a.ends_at) && tstzrange(slot_start, slot_end)
      )
      -- kapatılmış bir blokla çakışmıyorsa (işletme geneli veya bu çalışana özel)
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

-- ----------------------------------------------------------------------------
-- 4) GÜVENLİ RANDEVU OLUŞTURMA
--    Tüm kontroller tek bir transaction içinde yapılır. Çakışma durumunda
--    EXCLUDE constraint devreye girer ve istisna fırlatır — bu sayede iki
--    kişi aynı anda aynı çalışanın aynı saatini asla alamaz (race condition yok).
--    SECURITY DEFINER: anonim/customer rolü randevu tablosuna doğrudan yazamaz,
--    sadece bu fonksiyon üzerinden, kontrollü şekilde yazabilir.
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
  v_business_status business_status;
begin
  if p_starts_at <= now() then
    raise exception 'Geçmiş bir saate randevu oluşturulamaz.';
  end if;

  select status into v_business_status from businesses where id = p_business_id;
  if v_business_status is distinct from 'active' and v_business_status is distinct from 'pending' then
    raise exception 'Bu işletme şu anda randevu kabul etmiyor.';
  end if;

  select duration_minutes, price into v_duration, v_price
  from services
  where id = p_service_id and business_id = p_business_id and is_active;

  if v_duration is null then
    raise exception 'Seçilen hizmet bu işletmede bulunamadı.';
  end if;

  if not exists (
    select 1 from employees
    where id = p_employee_id and business_id = p_business_id and is_active
  ) then
    raise exception 'Seçilen çalışan bu işletmede bulunamadı.';
  end if;

  v_ends_at := p_starts_at + make_interval(mins => v_duration);

  -- müşteriyi telefon numarasına göre bul ya da oluştur
  select id into v_customer_id from customers where phone = p_customer_phone order by created_at desc limit 1;
  if v_customer_id is null then
    insert into customers (full_name, phone) values (p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  -- exclude constraint çakışma varsa burada hata fırlatır (23P01)
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
grant execute on function get_available_slots to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) İşletme panelinden manuel randevu oluşturma (işletme sahibi/çalışanı için)
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
  -- yetki kontrolü: çağıran kullanıcı bu işletmenin üyesi mi?
  if not exists (
    select 1 from business_members bm
    where bm.business_id = p_business_id and bm.profile_id = auth.uid()
  ) and not exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  v_result := book_appointment(p_business_id, p_employee_id, p_service_id, p_starts_at, p_customer_name, p_customer_phone, p_note);
  update appointments set status = p_status, is_manual = true where id = v_result.id returning * into v_result;
  return v_result;
end;
$$;

grant execute on function book_appointment_manual to authenticated;
