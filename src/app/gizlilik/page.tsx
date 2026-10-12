import type { Metadata } from "next";
import { SiteHeader } from "@/components/customer/SiteHeader";
import { SiteFooter } from "@/components/customer/SiteFooter";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Kuaförüm'ün kişisel verileri nasıl topladığı ve koruduğu hakkında bilgi.",
};

export default function PrivacyPage() {
  return (
    <>
    <SiteHeader />
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-3xl text-ink">Gizlilik Politikası</h1>
      <div className="mt-6 space-y-5 text-stone-600">
        <section>
          <h2 className="font-medium text-ink">Hangi verileri topluyoruz</h2>
          <p className="mt-1 text-sm">
            Randevu oluştururken yalnızca ad soyad, telefon numarası ve isteğe bağlı bir not
            alıyoruz. Hesap oluşturmadan (misafir olarak) randevu alabilirsiniz.
          </p>
        </section>
        <section>
          <h2 className="font-medium text-ink">Verileriniz kiminle paylaşılır</h2>
          <p className="mt-1 text-sm">
            Randevu bilgileriniz yalnızca randevu aldığınız işletmeyle paylaşılır. Bir işletme
            başka bir işletmenin müşteri bilgilerine veritabanı düzeyinde erişemez (satır düzeyi
            güvenlik politikaları ile teknik olarak ayrılmıştır).
          </p>
        </section>
        <section>
          <h2 className="font-medium text-ink">Yorum ve değerlendirmeler</h2>
          <p className="mt-1 text-sm">
            Yalnızca tamamlanmış bir randevunuz varsa, randevu sırasında verdiğiniz telefon
            numarasıyla doğrulanarak yorum bırakabilirsiniz.
          </p>
        </section>
        <section>
          <h2 className="font-medium text-ink">İletişim</h2>
          <p className="mt-1 text-sm">
            Verilerinizle ilgili bir talebiniz olursa randevu aldığınız işletmeyle veya platform
            yöneticisiyle iletişime geçebilirsiniz.
          </p>
        </section>
        <p className="text-xs text-stone-400">
          Bu platform aktif geliştirme aşamasındadır; bu metin genel bir bilgilendirmedir ve
          hukuki danışmanlık yerine geçmez.
        </p>
      </div>
    </main>
  <SiteFooter />
  </>
  );
}
