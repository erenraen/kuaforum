import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "İşletmeniz İçin",
  description: "Kuaförünüzü/berberinizi Kuaförüm'e ekleyin, ilk 3 gün ücretsiz deneyin, Instagram'dan yeni müşteriler kazanın.",
};

const STEPS = [
  {
    title: "Instagram'dan bize yazın",
    body: "İşletme adınızı, adresinizi, telefon numaranızı ve Instagram hesabınızı bize iletin.",
  },
  {
    title: "İşletmenizi biz sisteme ekleyelim",
    body: "Bilgilerinizi aldıktan sonra işletmenizi 1-2 dakika içinde platforma ekliyoruz; size bir giriş hesabı tanımlıyoruz.",
  },
  {
    title: "İlk 3 gün ücretsiz deneyin",
    body: "Hiçbir ödeme bilgisi istemeden randevu sisteminizi, panelinizi ve müşteri akışınızı test edin.",
  },
  {
    title: "Devam etmek isterseniz plan seçin",
    body: "Deneme süresi bittiğinde dilediğiniz paketle devam edebilirsiniz. Müşterilerinizden hiçbir zaman ücret veya komisyon alınmaz.",
  },
];

export default function ForBusinessPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl text-ink sm:text-4xl">Instagram'dan müşterilerinizi platforma getirin</h1>
      <p className="mt-4 text-lg text-stone-600">
        Kuaförüm, müşterilerinizin sizi bulup ücretsiz online randevu almasını sağlar. İşletmenizden
        hiçbir zaman randevu komisyonu alınmaz; sadece aylık bir ilan/üyelik ücreti vardır ve ilk 3
        gün tamamen ücretsizdir.
      </p>

      <div className="mt-10 space-y-5">
        {STEPS.map((step, i) => (
          <div key={step.title} className="flex gap-4 rounded-xl2 border border-stone-200 bg-white p-5">
            <span className="font-display text-2xl italic text-moss-600">{i + 1}</span>
            <div>
              <h2 className="font-medium text-ink">{step.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl2 bg-ink p-6 text-white">
        <h2 className="font-display text-xl">Hazır mısınız?</h2>
        <p className="mt-2 text-stone-300">
          Instagram üzerinden bize yazın: işletme adınızı, adresinizi, telefon numaranızı ve
          sunduğunuz hizmetleri paylaşın. Size 1-2 iş günü içinde dönüş yapıp hesabınızı kuralım.
        </p>
        <p className="mt-3 text-sm text-stone-400">
          Zaten bir hesabınız mı var?{" "}
          <Link href="/giris" className="text-white underline hover:text-stone-200">
            İşletme paneline giriş yapın
          </Link>
          .
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl2 border border-stone-200 bg-white p-4">
          <p className="font-medium text-ink">%0 randevu komisyonu</p>
          <p className="mt-1 text-sm text-stone-500">Aldığınız her randevudan sadece siz kazanırsınız.</p>
        </div>
        <div className="rounded-xl2 border border-stone-200 bg-white p-4">
          <p className="font-medium text-ink">3 gün ücretsiz deneme</p>
          <p className="mt-1 text-sm text-stone-500">Hiçbir ödeme bilgisi istemeden test edin.</p>
        </div>
        <div className="rounded-xl2 border border-stone-200 bg-white p-4">
          <p className="font-medium text-ink">İsterseniz kendi web siteniz</p>
          <p className="mt-1 text-sm text-stone-500">Aynı verilerle markanıza özel bir site de açılabilir.</p>
        </div>
      </div>
    </main>
  );
}
