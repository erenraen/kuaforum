-- ============================================================================
-- 06_storage.sql
-- İşletme görselleri (logo, kapak, galeri, çalışan fotoğrafı) için Storage
-- bucket ve RLS politikaları. Dosya yolu kuralı: "{business_id}/..." — bu
-- sayede bir işletme yalnızca kendi klasörüne yazabilir, başka işletmenin
-- dosyalarına asla dokunamaz (is_business_member() ile aynı yetki mantığı).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-assets', 'business-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Bucket public okumaya açık (profil/keşif sayfalarında görsel göstermek için),
-- ama YAZMA (insert/update/delete) sadece ilgili işletmenin üyesine açık.
-- Dosya yolunun ilk klasörü ("{business_id}/dosya.jpg") business_id olmalı.

create policy "business_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'business-assets');

create policy "business_assets_member_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-assets'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "business_assets_member_update"
  on storage.objects for update
  using (
    bucket_id = 'business-assets'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

create policy "business_assets_member_delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-assets'
    and is_business_member((storage.foldername(name))[1]::uuid)
  );

-- Admin her zaman tam erişime sahip
create policy "business_assets_admin_all"
  on storage.objects for all
  using (bucket_id = 'business-assets' and is_admin())
  with check (bucket_id = 'business-assets' and is_admin());
