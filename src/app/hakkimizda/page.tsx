import type { Metadata } from "next";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { SiteFooter } from "@/components/customer/SiteFooter";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Kuaförüm, müşterilerin kuaför ve berber bulup ücretsiz randevu aldığı bir platformdur.",
};

export default function AboutPage() {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Hakkımızda</h1>
      <div className="mt-6 space-y-4 text-stone-600">
        <p>
          Kuaförüm, müşterilerin bulundukları il ve ilçedeki kuaför, berber ve güzellik
          işletmelerini keşfedip tamamen ücretsiz şekilde online randevu almasını sağlayan bir
          platformdur.
        </p>
        <p>
          Müşteriden hiçbir zaman randevu ücreti, komisyon veya üyelik ücreti alınmaz. İşletmeler
          platforma katılarak profillerini oluşturur, ilk 3 gün ücretsiz deneme sonrasında
          dilerlerse aylık bir ilan/üyelik planıyla devam eder.
        </p>
        <p>
          Bu platform şu anda aktif geliştirme aşamasındadır. Gösterilen bazı demo işletmeler test
          amaçlıdır ve gerçek işletmeleri temsil etmez.
        </p>
      </div>
    </main>
  <SiteFooter />
  </>
  );
}
