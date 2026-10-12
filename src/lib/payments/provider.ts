// NOT: Bu dosya yalnızca server action'lar içinden import edilmelidir
// (örn. src/lib/business-actions.ts). "server-only" paketi eklemek yerine
// bu kural yorum olarak belirtildi — gereksiz bağımlılık eklenmedi.
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// PAYMENT PROVIDER SOYUTLAMASI
//
// Amaç: ileride gerçek bir sağlayıcı (iyzico, Stripe, ...) bağlandığında bu
// dosyanın DIŞINDAKİ hiçbir kodun değişmesine gerek kalmaması. Tüm app kodu
// (server action'lar, UI) sadece bu interface'i kullanır.
//
// Tutar/fiyat HİÇBİR ZAMAN burada parametre olarak alınmaz — her zaman
// PostgreSQL tarafında appointment.price_at_booking'den okunur (bkz.
// create_pending_payment RPC). Bu, client'tan gelen bir "amount" değerine asla
// güvenilmediğinin garantisidir.
// ---------------------------------------------------------------------------

export type PaymentRecord = {
  id: string;
  appointment_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "canceled" | "refunded";
  provider: string;
  provider_payment_id: string | null;
};

export interface PaymentProvider {
  /** Randevu için ödeme kaydı oluşturur (idempotent — aynı randevu için tekrar çağrılırsa mevcut kaydı döner). */
  createPayment(appointmentId: string): Promise<PaymentRecord>;
  /** Sağlayıcıdan gelen sonucu doğrulayıp kaydı 'paid' yapar. */
  verifyPayment(paymentId: string, providerPaymentId?: string): Promise<PaymentRecord>;
  /** Ödenmiş bir işlemi iade eder. */
  refundPayment(paymentId: string): Promise<PaymentRecord>;
  /** Bekleyen bir ödemeyi iptal eder (örn. müşteri vazgeçti). */
  cancelPayment(paymentId: string): Promise<PaymentRecord>;
}

// ---------------------------------------------------------------------------
// MOCK PROVIDER — gerçek bir ödeme sağlayıcısı henüz bağlı değil. Bu sınıf
// doğrudan PostgreSQL RPC'lerini çağırır (RLS + yetki kontrolü DB tarafında).
// Gerçek sağlayıcı bağlanınca bu dosyaya `IyzicoProvider implements
// PaymentProvider` gibi yeni bir sınıf eklenip export edilen `getPaymentProvider()`
// o sınıfı dönecek şekilde değiştirilir — app kodunun geri kalanı değişmez.
// ---------------------------------------------------------------------------
class MockPaymentProvider implements PaymentProvider {
  async createPayment(appointmentId: string): Promise<PaymentRecord> {
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("create_pending_payment", { p_appointment_id: appointmentId })
      .single();
    if (error) throw new Error(error.message);
    return data as PaymentRecord;
  }

  async verifyPayment(paymentId: string, providerPaymentId?: string): Promise<PaymentRecord> {
    const supabase = createClient();
    // Mock akış: processing üzerinden geçip paid'e taşır (gerçek sağlayıcıda
    // bu adım webhook/callback doğrulamasından sonra çağrılır).
    await supabase.rpc("mark_payment_processing", { p_payment_id: paymentId });
    const { data, error } = await supabase
      .rpc("mark_payment_paid", { p_payment_id: paymentId, p_provider_payment_id: providerPaymentId ?? null })
      .single();
    if (error) throw new Error(error.message);
    return data as PaymentRecord;
  }

  async refundPayment(paymentId: string): Promise<PaymentRecord> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("refund_payment", { p_payment_id: paymentId }).single();
    if (error) throw new Error(error.message);
    return data as PaymentRecord;
  }

  async cancelPayment(paymentId: string): Promise<PaymentRecord> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("cancel_payment", { p_payment_id: paymentId }).single();
    if (error) throw new Error(error.message);
    return data as PaymentRecord;
  }
}

let _provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  // Gerçek sağlayıcı bağlanınca: process.env.PAYMENT_PROVIDER === "iyzico"
  // gibi bir koşulla burada seçim yapılabilir. Şimdilik tek seçenek mock'tur.
  if (!_provider) _provider = new MockPaymentProvider();
  return _provider;
}
