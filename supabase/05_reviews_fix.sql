-- ============================================================================
-- 05_reviews_fix.sql
-- SORUN: reviews_insert RLS politikası customers.profile_id = auth.uid() şartı
-- arıyordu, ama randevu alan müşteriler misafir (profile_id = null) olarak
-- oluşuyor. Bu yüzden hiç kimse pratikte yorum bırakamıyordu.
--
-- ÇÖZÜM: book_appointment() ile aynı desen — kontrollü bir SECURITY DEFINER
-- fonksiyon üzerinden, randevunun gerçekten "completed" olduğunu ve telefon
-- numarasının o randevunun müşterisiyle eştiğini doğrulayarak yorum eklenir.
-- Doğrudan tabloya insert RLS ile hâlâ engellidir (sadece admin yazabilir).
-- ============================================================================

-- Bir randevuya yalnızca bir kez yorum bırakılabilsin
alter table reviews
  add constraint reviews_appointment_unique unique (appointment_id);

-- Eski (çalışmayan) politikayı kaldır
drop policy if exists "reviews_insert" on reviews;

-- Doğrudan insert artık sadece admin'e açık; müşteri tarafı submit_review() kullanır
create policy "reviews_admin_insert" on reviews
  for insert with check (is_admin());

create or replace function submit_review(
  p_appointment_id uuid,
  p_customer_phone text,
  p_rating int,
  p_comment text default null
)
returns reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appt appointments;
  v_customer_phone text;
  v_result reviews;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Puan 1 ile 5 arasında olmalı.';
  end if;

  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'Randevu bulunamadı.';
  end if;

  if v_appt.status <> 'completed' then
    raise exception 'Sadece tamamlanmış randevular için yorum bırakılabilir.';
  end if;

  select phone into v_customer_phone from customers where id = v_appt.customer_id;
  if v_customer_phone is distinct from p_customer_phone then
    raise exception 'Telefon numarası bu randevuyla eşleşmiyor.';
  end if;

  if exists (select 1 from reviews where appointment_id = p_appointment_id) then
    raise exception 'Bu randevu için zaten bir yorum bırakılmış.';
  end if;

  insert into reviews (business_id, appointment_id, customer_id, rating, comment)
  values (v_appt.business_id, v_appt.id, v_appt.customer_id, p_rating, p_comment)
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function submit_review to anon, authenticated;

-- Müşterinin yorum sayfasını görebilmesi için randevunun asgari bilgilerini
-- döner (customer PII veya diğer müşterilerin verilerini SIZDIRMAZ).
create or replace function get_appointment_for_review(p_appointment_id uuid)
returns table (
  appointment_id uuid,
  business_name text,
  business_slug text,
  service_name text,
  starts_at timestamptz,
  status appointment_status,
  already_reviewed boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id,
    b.name,
    b.slug,
    s.name,
    a.starts_at,
    a.status,
    exists (select 1 from reviews r where r.appointment_id = a.id)
  from appointments a
  join businesses b on b.id = a.business_id
  join services s on s.id = a.service_id
  where a.id = p_appointment_id;
$$;

grant execute on function get_appointment_for_review to anon, authenticated;
