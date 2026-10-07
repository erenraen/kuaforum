-- ============================================================================
-- 09_payments_notifications.sql
-- SADECE enum genişletmesi. PostgreSQL kuralı: "ALTER TYPE ... ADD VALUE" ile
-- eklenen yeni bir enum değeri, AYNI transaction içinde kullanılamaz (fonksiyon
-- içinde cast edilirse "unsafe use of new value" hatası alınır). Bu yüzden bu
-- değişiklik kendi dosyasında, 10_payments_notifications.sql'den ÖNCE ve AYRI
-- bir "Run" işlemi olarak çalıştırılmalı.
--
-- payment_status enum'u "pending -> processing -> paid" akışını ve hata
-- durumlarını ("failed", "canceled", "refunded") destekleyecek şekilde
-- genişletiliyor. Bu enum subscriptions.payment_status ile de paylaşılıyor;
-- yeni değerler orada da anlamlıdır.
-- ============================================================================

alter type payment_status add value if not exists 'processing';
alter type payment_status add value if not exists 'canceled';
