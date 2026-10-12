import { getCurrentBusiness } from "@/lib/business";
import { WebsiteToggle } from "@/components/business/WebsiteToggle";

export default async function OwnWebsitePage() {
  const { business } = await getCurrentBusiness();
  if (!business) return null;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Kendi Web Sitem</h1>
      <p className="mt-1 max-w-lg text-sm text-stone-500">
        Mevcut profil bilgilerinizden (logo, renk, hizmetler, fiyatlar, çalışanlar, fotoğraflar,
        açıklama) otomatik olarak markanıza özel bir web sitesi oluşturulur. Yeni bir proje
        kodlamanıza gerek yoktur — aynı randevu motoru ve aynı veritabanı kullanılır.
      </p>

      <WebsiteToggle enabled={business.has_own_website} slug={business.slug} />
    </div>
  );
}
