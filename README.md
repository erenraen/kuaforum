# Kuaförüm — Kuaför/Berber Keşif & Randevu Platformu (MVP)

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage) ile
yazılmış, çalışır durumda bir MVP. Kod `npx tsc --noEmit` ve `npx next build` ile doğrulanmıştır
(24 sayfa başarıyla derleniyor).

## İçerik

- **Müşteri tarafı**: Ana sayfa, SEO uyumlu keşif sayfaları (`/il/ilce/kategori`), işletme detay +
  gerçek zamanlı randevu alma, randevu onay ekranı, Instagram kısa link yönlendirmesi (`/r/slug`)
- **İşletme paneli** (`/panel`): Dashboard, randevu yönetimi, takvim, hizmetler, çalışanlar,
  çalışma saatleri, profil, son dakika boşluğu, paket/üyelik, kendi web sitesi aç/kapat
- **Platform admin paneli** (`/admin`): Genel istatistikler, işletme onaylama/reddetme/doğrulama,
  yeni işletme ekleme (owner hesabı otomatik oluşturur), tüm randevular, şehir/ilçe/kategori/paket
  yönetimi
- **Kendi web sitesi** (`/site/slug`): İşletme verilerinden otomatik üretilen, aynı randevu
  motorunu kullanan marka sitesi
- **Veritabanı** (`supabase/*.sql`): Tam şema, RLS politikaları, randevu motoru (çakışmasız randevu
  için PostgreSQL `EXCLUDE` constraint + `book_appointment()` fonksiyonu), demo veri

## Kurulum

### 1) Supabase projesi oluşturun

[supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun, ardından SQL Editor'de
sırasıyla şu dosyaları çalıştırın:

```
supabase/01_schema.sql
supabase/02_functions.sql
supabase/03_rls.sql
supabase/04_seed.sql          -- (isteğe bağlı, demo veri)
supabase/05_reviews_fix.sql   -- yorum sistemi güvenlik düzeltmesi
supabase/06_storage.sql       -- görsel yükleme (logo/kapak/galeri) için Storage bucket + RLS
supabase/07_hardening.sql     -- production sertleştirme: timezone, tam randevu validasyonu, owner/staff ayrımı
supabase/08_lifecycle.sql     -- randevu yaşam döngüsü: status geçiş kuralları, audit log, iptal/yeniden planlama, QR check-in, ödeme altyapısı, bekleme listesi
```

### 2) Ortam değişkenleri

`.env.local.example` dosyasını `.env.local` olarak kopyalayın ve Supabase proje ayarlarınızdan
(Project Settings → API) doldurun:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # sadece admin işlemleri için, gizli tutun
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3) İlk admin kullanıcısını oluşturun

Supabase Dashboard → Authentication → Users → "Add user" ile bir kullanıcı oluşturun, sonra
SQL Editor'de:

```sql
insert into profiles (id, role, full_name)
values ('<yeni-kullanıcının-uuid-si>', 'admin', 'Platform Admin');
```

### 4) Çalıştırın

```bash
npm install
npm run dev
```

`http://localhost:3000` → müşteri tarafı
`http://localhost:3000/giris` → işletme paneli girişi
`http://localhost:3000/admin/giris` → platform admin girişi

Demo verisiyle geldiyseniz (`04_seed.sql`), işletmeleri panelden yönetebilmek için ilgili
`businesses.owner_id` ve `business_members` kayıtlarını admin panelinden ("Yeni İşletme Ekle" ile
gerçek bir owner hesabı oluşturarak) veya SQL ile elle bağlamanız gerekir — demo veri şu an
sahipsiz (owner_id null) olarak gelir, sadece müşteri tarafını göstermek içindir.

## Mimari notları

- **Randevu çakışması** hem veritabanı seviyesinde (`appointments` tablosunda
  `EXCLUDE USING GIST` constraint) hem de `book_appointment()` PostgreSQL fonksiyonu (SECURITY
  DEFINER, transaction içinde) ile engellenir. İki kişi aynı anda aynı çalışanın aynı saatini
  asla alamaz.
- **Çok kiracılı izolasyon**: Her tablo RLS ile korunur; bir işletme başka işletmenin müşteri,
  randevu, çalışan veya finans verisini hiçbir koşulda göremez (`supabase/03_rls.sql`).
- **Kendi web sitesi**: Ayrı bir proje değildir — `/site/[slug]` sayfası işletmenin mevcut
  verilerinden (logo, renk, hizmetler, çalışanlar, fotoğraflar) aynı anda üretilir ve aynı
  randevu motorunu kullanır.
- **Tip güvenliği**: `src/types/database.ts` elle yazılmış temel tipleri içerir. Gerçek projede
  `npx supabase gen types typescript --project-id <id> > src/types/database.ts` ile Supabase
  CLI'dan tam tipleri üretip `src/lib/supabase/*.ts` içindeki client'lara generic olarak
  (`createBrowserClient<Database>(...)`) verebilirsiniz.
- **Ödeme**: `subscriptions` tablosu ve ilgili alanlar (plan, amount, payment_status vb.)
  hazırdır; gerçek ödeme sağlayıcısı (iyzico, Stripe vb.) entegrasyonu ileride
  `panel/paket` sayfasındaki "Yakında" butonuna bağlanacak şekilde tasarlanmıştır.

## Öncelik sırasına göre durum

| # | Özellik | Durum |
|---|---------|-------|
| 1 | Veritabanı şeması | ✅ |
| 2 | Authentication (Supabase Auth + middleware) | ✅ |
| 3 | İşletme modeli | ✅ |
| 4 | Hizmet modeli | ✅ |
| 5 | Çalışan modeli | ✅ |
| 6 | Çalışma saatleri | ✅ |
| 7 | Randevu motoru (çakışmasız) | ✅ |
| 8 | Müşteri randevu akışı | ✅ |
| 9 | İşletme paneli | ✅ |
| 10 | Admin paneli | ✅ |
| 11 | İl/ilçe keşif sistemi | ✅ |
| 12 | İşletme profil sayfaları | ✅ |
| 13 | 3 günlük deneme sistemi | ✅ (trigger ile otomatik) |
| 14 | Paket/üyelik altyapısı | ✅ (fiyatlar admin'den değiştirilebilir, ödeme mock) |
| 15 | Kendi web sitesi altyapısı | ✅ |
| 16 | SEO | ✅ (dinamik meta + OG, `/il/ilce/kategori` URL yapısı) |
| 17 | Mobil responsive | ✅ |

## Sonraki adımlar (ileride eklenecek özellikler için hazır altyapı)

`waitlist_entries` (bekleme listesi), `last_minute_slots` (son dakika) tabloları hazır; SMS/e-posta/
push bildirim entegrasyonu, gerçek ödeme, favoriler, harita/mesafe hesaplama, çoklu şube ve özel
domain desteği bu şemaların üzerine eklenebilecek şekilde tasarlanmıştır.
