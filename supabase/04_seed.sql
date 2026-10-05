-- ============================================================================
-- DEMO/ÖRNEK VERİ
-- Not: Bu veriler yalnızca geliştirme ortamı içindir, gerçek işletmeleri
-- temsil etmez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ŞEHİR / İLÇE
-- ----------------------------------------------------------------------------
insert into cities (name, slug, is_popular) values
  ('İstanbul', 'istanbul', true)
on conflict do nothing;

insert into districts (city_id, name, slug, is_popular)
select c.id, d.name, d.slug, d.is_popular
from cities c, (values
  ('Kadıköy', 'kadikoy', true),
  ('Üsküdar', 'uskudar', true),
  ('Ataşehir', 'atasehir', false),
  ('Ümraniye', 'umraniye', true),
  ('Maltepe', 'maltepe', false),
  ('Kartal', 'kartal', false),
  ('Beşiktaş', 'besiktas', true),
  ('Şişli', 'sisli', true),
  ('Bakırköy', 'bakirkoy', false),
  ('Fatih', 'fatih', false)
) as d(name, slug, is_popular)
where c.slug = 'istanbul'
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- KATEGORİLER
-- ----------------------------------------------------------------------------
insert into categories (name, slug, business_type, sort_order) values
  ('Berberler', 'berberler', 'erkek_beber', 1),
  ('Kuaförler', 'kuaforler', 'kadin_kuafor', 2),
  ('Unisex Salonlar', 'unisex-salonlar', 'unisex', 3),
  ('Güzellik Salonları', 'guzellik-salonlari', 'guzellik_salonu', 4)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- PAKETLER
-- ----------------------------------------------------------------------------
insert into plans (code, name, description, price, billing_period, includes_own_website, is_featured, sort_order) values
  ('platform_ilani', 'Platform İlanı', 'İşletmeniz platformda listelenir ve online randevu alabilirsiniz.', 299, 'monthly', false, false, 1),
  ('platform_site', 'Platform İlanı + Kendi Web Siteniz', 'Platform ilanına ek olarak markanıza özel bir web siteniz olur.', 499, 'monthly', true, false, 2),
  ('premium', 'Premium / Öne Çıkan', 'Arama sonuçlarında öne çıkarılır, tüm özellikler dahildir.', 799, 'monthly', true, true, 3)
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- DEMO İŞLETMELER
-- ----------------------------------------------------------------------------
do $$
declare
  v_kadikoy uuid; v_uskudar uuid; v_besiktas uuid; v_sisli uuid; v_umraniye uuid;
  v_istanbul uuid;
  v_cat_berber uuid; v_cat_kuafor uuid; v_cat_unisex uuid; v_cat_guzellik uuid;
  v_biz uuid;
  v_emp1 uuid; v_emp2 uuid;
  v_svc1 uuid; v_svc2 uuid; v_svc3 uuid;
  wd int;
begin
  select id into v_istanbul from cities where slug = 'istanbul';
  select id into v_kadikoy from districts where slug = 'kadikoy' and city_id = v_istanbul;
  select id into v_uskudar from districts where slug = 'uskudar' and city_id = v_istanbul;
  select id into v_besiktas from districts where slug = 'besiktas' and city_id = v_istanbul;
  select id into v_sisli from districts where slug = 'sisli' and city_id = v_istanbul;
  select id into v_umraniye from districts where slug = 'umraniye' and city_id = v_istanbul;

  select id into v_cat_berber from categories where slug = 'berberler';
  select id into v_cat_kuafor from categories where slug = 'kuaforler';
  select id into v_cat_unisex from categories where slug = 'unisex-salonlar';
  select id into v_cat_guzellik from categories where slug = 'guzellik-salonlari';

  -- ============ Gözde Barber Shop (Kadıköy, erkek berber) ============
  insert into businesses (name, slug, description, business_type, category_id, phone, instagram_handle,
    city_id, district_id, address, status, is_verified, verified_at, subscription_status)
  values ('Gözde Barber Shop', 'gozde-barber', 'Kadıköy''de 10 yıllık deneyimle klasik ve modern erkek tıraşı.',
    'erkek_beber', v_cat_berber, '+905551112233', 'gozdebarber', v_istanbul, v_kadikoy,
    'Caferağa Mah. Moda Cad. No:12, Kadıköy', 'active', true, now(), 'active')
  returning id into v_biz;

  insert into business_hours (business_id, weekday, is_closed, opens_at, closes_at)
  select v_biz, wd, (wd = 0), '09:00', '20:00' from generate_series(0,6) as wd;

  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Ahmet Yıldız', 'Usta Berber', 1) returning id into v_emp1;
  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Mehmet Kaya', 'Berber', 2) returning id into v_emp2;

  insert into employee_hours (employee_id, weekday, is_closed, opens_at, closes_at)
  select e.id, wd, (wd = 0), '09:00', '20:00' from employees e, generate_series(0,6) as wd where e.business_id = v_biz;

  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Saç Kesimi', 'Makas ve tıraş makinesi ile modern kesim.', 400, 30, 1) returning id into v_svc1;
  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Sakal Tıraşı', 'Ustura ile klasik sakal tıraşı.', 250, 20, 2) returning id into v_svc2;
  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Saç + Sakal', 'Saç kesimi ve sakal tıraşı bir arada.', 550, 50, 3) returning id into v_svc3;

  insert into employee_services (employee_id, service_id) values
    (v_emp1, v_svc1), (v_emp1, v_svc2), (v_emp1, v_svc3),
    (v_emp2, v_svc1), (v_emp2, v_svc3);

  -- ============ Berrin Hair Studio (Üsküdar, kadın kuaför) ============
  insert into businesses (name, slug, description, business_type, category_id, phone, instagram_handle,
    city_id, district_id, address, status, is_verified, verified_at, subscription_status)
  values ('Berrin Hair Studio', 'berrin-hair-studio', 'Boya, kesim ve bakım hizmetlerinde uzman kadın kuaförü.',
    'kadin_kuafor', v_cat_kuafor, '+905552223344', 'berrinhairstudio', v_istanbul, v_uskudar,
    'Altunizade Mah. Kısıklı Cad. No:45, Üsküdar', 'active', true, now(), 'active')
  returning id into v_biz;

  insert into business_hours (business_id, weekday, is_closed, opens_at, closes_at)
  select v_biz, wd, false, '10:00', '19:00' from generate_series(0,6) as wd;

  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Berrin Demir', 'Kuaför / Sahibi', 1) returning id into v_emp1;

  insert into employee_hours (employee_id, weekday, is_closed, opens_at, closes_at)
  select e.id, wd, false, '10:00', '19:00' from employees e, generate_series(0,6) as wd where e.business_id = v_biz;

  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Fön', 'Yıkama ve fön çekimi.', 300, 30, 1) returning id into v_svc1;
  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Saç Boyası', 'Tek renk kök/boy boyama.', 900, 90, 2) returning id into v_svc2;

  insert into employee_services (employee_id, service_id) values (v_emp1, v_svc1), (v_emp1, v_svc2);

  -- ============ Style Point Unisex (Beşiktaş) ============
  insert into businesses (name, slug, description, business_type, category_id, phone, instagram_handle,
    city_id, district_id, address, status, is_verified, subscription_status)
  values ('Style Point Unisex', 'style-point-unisex', 'Kadın ve erkek müşterilere hizmet veren modern salon.',
    'unisex', v_cat_unisex, '+905553334455', 'stylepoint', v_istanbul, v_besiktas,
    'Levent Mah. Büyükdere Cad. No:78, Beşiktaş', 'active', false, 'trial')
  returning id into v_biz;

  insert into business_hours (business_id, weekday, is_closed, opens_at, closes_at)
  select v_biz, wd, false, '09:30', '21:00' from generate_series(0,6) as wd;

  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Selin Aksoy', 'Kuaför', 1) returning id into v_emp1;

  insert into employee_hours (employee_id, weekday, is_closed, opens_at, closes_at)
  select e.id, wd, false, '09:30', '21:00' from employees e, generate_series(0,6) as wd where e.business_id = v_biz;

  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Saç Kesimi', 'Kadın/erkek saç kesimi.', 350, 30, 1) returning id into v_svc1;

  insert into employee_services (employee_id, service_id) values (v_emp1, v_svc1);

  -- ============ Elit Güzellik Merkezi (Şişli, güzellik salonu) ============
  insert into businesses (name, slug, description, business_type, category_id, phone, instagram_handle,
    city_id, district_id, address, status, is_verified, verified_at, subscription_status)
  values ('Elit Güzellik Merkezi', 'elit-guzellik-merkezi', 'Cilt bakımı, epilasyon ve nail art hizmetleri.',
    'guzellik_salonu', v_cat_guzellik, '+905554445566', 'elitguzellik', v_istanbul, v_sisli,
    'Mecidiyeköy Mah. Şişli, İstanbul', 'active', true, now(), 'active')
  returning id into v_biz;

  insert into business_hours (business_id, weekday, is_closed, opens_at, closes_at)
  select v_biz, wd, (wd = 0), '10:00', '20:00' from generate_series(0,6) as wd;

  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Ayşe Yılmaz', 'Güzellik Uzmanı', 1) returning id into v_emp1;

  insert into employee_hours (employee_id, weekday, is_closed, opens_at, closes_at)
  select e.id, wd, (wd = 0), '10:00', '20:00' from employees e, generate_series(0,6) as wd where e.business_id = v_biz;

  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Nail Art', 'Klasik manikür ve nail art.', 450, 60, 1) returning id into v_svc1;
  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Cilt Bakımı', 'Derin temizlik cilt bakımı.', 700, 60, 2) returning id into v_svc2;

  insert into employee_services (employee_id, service_id) values (v_emp1, v_svc1), (v_emp1, v_svc2);

  -- ============ Kral Berber (Ümraniye, erkek berber, deneme sürecinde) ============
  insert into businesses (name, slug, description, business_type, category_id, phone, instagram_handle,
    city_id, district_id, address, status, is_verified, subscription_status)
  values ('Kral Berber', 'kral-berber', 'Ümraniye''de hızlı ve kaliteli erkek tıraşı.',
    'erkek_beber', v_cat_berber, '+905555556677', 'kralberber', v_istanbul, v_umraniye,
    'İstiklal Mah. Alemdağ Cad. No:5, Ümraniye', 'active', false, 'trial')
  returning id into v_biz;

  insert into business_hours (business_id, weekday, is_closed, opens_at, closes_at)
  select v_biz, wd, false, '09:00', '22:00' from generate_series(0,6) as wd;

  insert into employees (business_id, full_name, title, sort_order) values
    (v_biz, 'Emre Şahin', 'Berber', 1) returning id into v_emp1;

  insert into employee_hours (employee_id, weekday, is_closed, opens_at, closes_at)
  select e.id, wd, false, '09:00', '22:00' from employees e, generate_series(0,6) as wd where e.business_id = v_biz;

  insert into services (business_id, name, description, price, duration_minutes, sort_order) values
    (v_biz, 'Saç Kesimi', 'Standart erkek saç kesimi.', 300, 30, 1) returning id into v_svc1;

  insert into employee_services (employee_id, service_id) values (v_emp1, v_svc1);

end $$;
