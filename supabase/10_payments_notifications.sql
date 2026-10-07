-- ============================================================================
-- 10_payments_notifications.sql
-- ÖNEMLİ: 09_payments_notifications.sql'in (enum genişletmesi) AYRI bir
-- "Run" işlemiyle önce çalıştırılmış olması gerekir.
--
-- FAZ 1-3: Payment production-ready (lifecycle + idempotency + güvenlik)
-- FAZ 6-10: Notification/event altyapısı + waitlist entegrasyonu + reminder
-- Mevcut appointments/payments/waitlist_entries şemasını BOZMAZ.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PAYMENT IDEMPOTENCY — aynı appointment için aynı anda yalnızca bir
--    "aktif" (pending/processing/paid) ödeme kaydı olabilir. Çift tıklama
--    veya eşzamanlı istek iki ödeme kaydı oluşturamaz.
-- ----------------------------------------------------------------------------
create unique index if not exists idx_payments_one_active_per_appointment
  on payments (appointment_id)
  where status in ('pending', 'processing', 'paid');

-- ----------------------------------------------------------------------------
-- 2) PAYMENT STATUS GEÇİŞ KURALLARI (appointment ile aynı desen)
-- ----------------------------------------------------------------------------
create or replace function enforce_payment_status_transition()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    when 'pending'    then new.status in ('processing', 'failed', 'canceled')
    when 'processing' then new.status in ('paid', 'failed', 'canceled')
    when 'paid'       then new.status in ('refunded')
    when 'failed'     then false
    when 'canceled'   then false
    when 'refunded'   then false
    else false
  end;

  if not v_allowed then
    raise exception 'Geçersiz ödeme durumu geçişi: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payment_status_transition on payments;
create trigger trg_payment_status_transition
before update of status on payments
for each row execute function enforce_payment_status_transition();

-- ----------------------------------------------------------------------------
-- 3) create_pending_payment() YENİDEN TANIMLANIYOR — idempotent hale getirildi.
--    Aynı appointment için ikinci kez çağrılırsa (çift tıklama, ağ retry'ı)
--    YENİ bir kayıt oluşturmak yerine mevcut aktif ödemeyi döner.
--    Tutar HER ZAMAN appointment.price_at_booking'den okunur — frontend'den
--    gelen hiçbir amount/price değeri kabul edilmez.
-- ----------------------------------------------------------------------------
create or replace function create_pending_payment(p_appointment_id uuid)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_existing payments;
  v_result payments;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  if not is_business_member(v_appt.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  if v_appt.status = 'canceled' then
    raise exception 'İptal edilmiş bir randevu için ödeme oluşturulamaz.';
  end if;

  -- idempotency: zaten aktif bir ödeme varsa onu dön (yeni kayıt açma)
  select * into v_existing from payments
  where appointment_id = p_appointment_id and status in ('pending', 'processing', 'paid')
  limit 1;

  if v_existing.id is not null then
    return v_existing;
  end if;

  insert into payments (appointment_id, business_id, customer_id, amount, status, provider)
  values (v_appt.id, v_appt.business_id, v_appt.customer_id, v_appt.price_at_booking, 'pending', 'mock')
  returning * into v_result;

  return v_result;
exception
  -- iki eşzamanlı istek aynı anda buraya girerse unique index ikincisini
  -- engeller; o durumda zaten var olan kaydı okuyup döneriz (gerçek
  -- idempotency garantisi — race condition'da bile iki kayıt oluşmaz).
  when unique_violation then
    select * into v_existing from payments
    where appointment_id = p_appointment_id and status in ('pending', 'processing', 'paid')
    limit 1;
    return v_existing;
end;
$$;

grant execute on function create_pending_payment to authenticated;

-- ----------------------------------------------------------------------------
-- 4) PAYMENT LIFECYCLE FONKSİYONLARI — gerçek sağlayıcı bağlanınca bu
--    fonksiyonlar provider webhook/callback'inden çağrılacak. Şimdilik
--    business/admin tarafından (mock test akışı için) tetiklenebilir.
-- ----------------------------------------------------------------------------
create or replace function mark_payment_processing(p_payment_id uuid)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Ödeme kaydı bulunamadı.'; end if;
  if not is_business_member(v_payment.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  update payments set status = 'processing' where id = p_payment_id returning * into v_payment;
  return v_payment;
end;
$$;

grant execute on function mark_payment_processing to authenticated;

create or replace function mark_payment_paid(p_payment_id uuid, p_provider_payment_id text default null)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Ödeme kaydı bulunamadı.'; end if;
  if not is_business_member(v_payment.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  update payments
  set status = 'paid', provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
  where id = p_payment_id
  returning * into v_payment;

  insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
  values ('payment_success', 'in_app', v_payment.business_id, v_payment.customer_id, v_payment.appointment_id,
    'Ödeme alındı', 'Randevunuz için ödeme başarıyla tamamlandı.');

  return v_payment;
end;
$$;

grant execute on function mark_payment_paid to authenticated;

create or replace function mark_payment_failed(p_payment_id uuid, p_error_message text default null)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Ödeme kaydı bulunamadı.'; end if;
  if not is_business_member(v_payment.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  update payments set status = 'failed' where id = p_payment_id returning * into v_payment;

  insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
  values ('payment_failed', 'in_app', v_payment.business_id, v_payment.customer_id, v_payment.appointment_id,
    'Ödeme başarısız', coalesce(p_error_message, 'Ödeme işlemi tamamlanamadı.'));

  return v_payment;
end;
$$;

grant execute on function mark_payment_failed to authenticated;

create or replace function cancel_payment(p_payment_id uuid)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Ödeme kaydı bulunamadı.'; end if;
  if not is_business_member(v_payment.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;

  update payments set status = 'canceled' where id = p_payment_id returning * into v_payment;
  return v_payment;
end;
$$;

grant execute on function cancel_payment to authenticated;

create or replace function refund_payment(p_payment_id uuid)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
begin
  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then raise exception 'Ödeme kaydı bulunamadı.'; end if;
  if not is_business_member(v_payment.business_id) and not is_admin() then
    raise exception 'Bu işleme yetkiniz yok.';
  end if;
  if v_payment.status <> 'paid' then
    raise exception 'Sadece ödenmiş bir işlem iade edilebilir.';
  end if;

  update payments set status = 'refunded' where id = p_payment_id returning * into v_payment;
  return v_payment;
end;
$$;

grant execute on function refund_payment to authenticated;

-- Müşterinin kendi randevusunun ödeme durumunu görmesi için (telefon doğrulamalı,
-- diğer tüm müşteri-yüzlü fonksiyonlarla aynı güvenlik deseni).
create or replace function get_payment_status_for_appointment(p_appointment_id uuid, p_customer_phone text)
returns table (status payment_status, amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  select c.phone into v_phone
  from appointments a join customers c on c.id = a.customer_id
  where a.id = p_appointment_id;

  if v_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  return query
    select p.status, p.amount from payments p
    where p.appointment_id = p_appointment_id
    order by p.created_at desc
    limit 1;
end;
$$;

grant execute on function get_payment_status_for_appointment to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5) NOTIFICATIONS — basit, güvenilir olay/bildirim günlüğü.
--    channel='in_app' olanlar şu an tek gerçek kanal; sms/email/whatsapp
--    ileride gerçek bir sağlayıcı bağlanınca aynı tabloya yazılabilir.
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  type text not null, -- 'appointment_created' | 'appointment_confirmed' | 'appointment_canceled' |
                       -- 'appointment_rescheduled' | 'appointment_completed' | 'appointment_no_show' |
                       -- 'appointment_reminder' | 'waitlist_slot_available' | 'payment_success' | 'payment_failed'
  channel text not null default 'in_app', -- 'in_app' | 'sms' | 'email' | 'whatsapp'
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  waitlist_entry_id uuid references waitlist_entries(id) on delete cascade,
  title text not null,
  message text not null,
  status text not null default 'sent', -- in_app için anında 'sent'; gerçek sms/email sağlayıcı bağlanınca 'pending'->'sent'/'failed' akışı kullanılabilir
  read_at timestamptz,
  sent_at timestamptz not null default now(),
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_notifications_business on notifications(business_id, created_at desc);
create index idx_notifications_appointment on notifications(appointment_id);
create index idx_notifications_waitlist_entry on notifications(waitlist_entry_id);

alter table notifications enable row level security;

-- İşletme SADECE kendi bildirimlerini görür. Müşteri-yüzlü erişim RLS ile
-- DEĞİL, aşağıdaki telefon-doğrulamalı RPC ile sağlanır (anon'un notifications
-- tablosuna doğrudan SELECT hakkı YOK — başka müşterinin bildirimini
-- göremeyeceğinin garantisi budur).
create policy "notifications_business_select" on notifications
  for select using (is_business_member(business_id) or is_admin());

create policy "notifications_admin_write" on notifications for all using (is_admin()) with check (is_admin());

create or replace function mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update notifications set read_at = now()
  where id = p_notification_id and business_id in (
    select bm.business_id from business_members bm where bm.profile_id = auth.uid()
  );
$$;

grant execute on function mark_notification_read to authenticated;

-- Müşterinin kendi randevusuyla ilgili bildirimleri görmesi (telefon doğrulamalı)
create or replace function get_appointment_notifications(p_appointment_id uuid, p_customer_phone text)
returns table (type text, title text, message text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  select c.phone into v_phone
  from appointments a join customers c on c.id = a.customer_id
  where a.id = p_appointment_id;

  if v_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  return query
    select n.type, n.title, n.message, n.created_at
    from notifications n
    where n.appointment_id = p_appointment_id
    order by n.created_at desc;
end;
$$;

grant execute on function get_appointment_notifications to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) OTOMATİK BİLDİRİM ÜRETİMİ — appointment olaylarına bağlı trigger'lar.
--    Mevcut appointment_events audit sistemine DOKUNULMADI, ayrı/ek bir
--    trigger olarak eklendi.
-- ----------------------------------------------------------------------------
create or replace function notify_on_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_type := case new.status
    when 'confirmed' then 'appointment_confirmed'
    when 'canceled'  then 'appointment_canceled'
    when 'completed' then 'appointment_completed'
    when 'no_show'   then 'appointment_no_show'
    else null
  end;

  if v_type is null then
    return new;
  end if;

  v_title := case new.status
    when 'confirmed' then 'Randevunuz onaylandı'
    when 'canceled'  then 'Randevunuz iptal edildi'
    when 'completed' then 'Randevunuz tamamlandı'
    when 'no_show'   then 'Randevuya gelinmedi olarak işaretlendi'
    else ''
  end;
  v_message := v_title || '.';

  insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
  values (v_type, 'in_app', new.business_id, new.customer_id, new.id, v_title, v_message);

  return new;
end;
$$;

drop trigger if exists trg_notify_appointment_status on appointments;
create trigger trg_notify_appointment_status
after update of status on appointments
for each row execute function notify_on_appointment_status_change();

create or replace function notify_on_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
  values ('appointment_created', 'in_app', new.business_id, new.customer_id, new.id,
    'Randevu oluşturuldu', 'Randevu talebiniz alındı.');
  return new;
end;
$$;

drop trigger if exists trg_notify_appointment_created on appointments;
create trigger trg_notify_appointment_created
after insert on appointments
for each row execute function notify_on_appointment_created();

create or replace function notify_on_appointment_rescheduled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.starts_at is distinct from old.starts_at then
    insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
    values ('appointment_rescheduled', 'in_app', new.business_id, new.customer_id, new.id,
      'Randevunuz yeniden planlandı', 'Randevunuz yeni bir saate taşındı.');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_appointment_rescheduled on appointments;
create trigger trg_notify_appointment_rescheduled
after update of starts_at on appointments
for each row execute function notify_on_appointment_rescheduled();

-- ----------------------------------------------------------------------------
-- 7) WAITLIST BİLDİRİM ENTEGRASYONU
--    Bir randevu iptal olduğunda (slot gerçekten boşaldığında), aynı
--    işletme+çalışan+hizmet+tarih kriterine uyan ve DAHA ÖNCE bildirilmemiş
--    bekleme listesi kayıtları için bildirim üretir. Aynı kayıt bir daha
--    bildirilmez (is_notified=true kalıcıdır).
-- ----------------------------------------------------------------------------
create or replace function notify_waitlist_on_cancellation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry waitlist_entries;
  v_local_date date;
begin
  if new.status <> 'canceled' or old.status = 'canceled' then
    return new;
  end if;

  v_local_date := (new.starts_at AT TIME ZONE 'Europe/Istanbul')::date;

  for v_entry in
    select * from waitlist_entries
    where business_id = new.business_id
      and employee_id = new.employee_id
      and service_id = new.service_id
      and desired_date = v_local_date
      and not is_notified
  loop
    insert into notifications (type, channel, business_id, customer_id, waitlist_entry_id, title, message)
    values (
      'waitlist_slot_available', 'in_app', new.business_id, v_entry.customer_id, v_entry.id,
      'Beklediğiniz saat boşaldı',
      'Bekleme listesine katıldığınız gün için bir saat boşaldı. Yeni randevu oluşturmak için işletmeyi tekrar ziyaret edin.'
    );

    update waitlist_entries set is_notified = true where id = v_entry.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_waitlist on appointments;
create trigger trg_notify_waitlist
after update of status on appointments
for each row execute function notify_waitlist_on_cancellation();

-- ----------------------------------------------------------------------------
-- 8) APPOINTMENT REMINDER ALTYAPISI
--    Gerçek bir cron job bu projede yok (bilinçli kısıt). Bu fonksiyon,
--    24 saat içinde başlayacak ve henüz reminder'ı oluşturulmamış 'confirmed'
--    randevular için bildirim üretir. İleride pg_cron veya bir Edge Function
--    tarafından periyodik çağrılabilir. Aynı randevu için iki kez reminder
--    oluşturmaz (unique index ile garanti).
-- ----------------------------------------------------------------------------
create unique index if not exists idx_notifications_one_reminder_per_appt
  on notifications (appointment_id)
  where type = 'appointment_reminder';

create or replace function generate_due_reminders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_appt record;
begin
  for v_appt in
    select a.* from appointments a
    where a.status = 'confirmed'
      and a.starts_at between now() and now() + interval '24 hours'
      and not exists (
        select 1 from notifications n where n.appointment_id = a.id and n.type = 'appointment_reminder'
      )
  loop
    begin
      insert into notifications (type, channel, business_id, customer_id, appointment_id, title, message)
      values ('appointment_reminder', 'in_app', v_appt.business_id, v_appt.customer_id, v_appt.id,
        'Yaklaşan randevunuz', 'Randevunuza 24 saatten az kaldı.');
      v_count := v_count + 1;
    exception when unique_violation then
      -- eşzamanlı çağrıda aynı randevu için ikinci kez eklenmeye çalışılırsa sessizce atla
      null;
    end;
  end loop;

  return v_count;
end;
$$;

-- Not: bilinçli olarak sadece authenticated (admin/business) çalıştırabilir;
-- anon'a açılmaz. Gerçek cron/Edge Function entegrasyonunda service_role ile
-- çağrılması önerilir.
grant execute on function generate_due_reminders to authenticated;
