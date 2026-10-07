import Link from "next/link";
import { SiteHeader } from "@/components/customer/SiteHeader";

export default function AppointmentSuccessPage({
  searchParams,
}: {
  searchParams: { isletme?: string; isletmeAdi?: string; randevuId?: string; hizmet?: string; tarih?: string; saat?: string; ad?: string };
}) {
  const { isletme, isletmeAdi, randevuId, hizmet, tarih, saat, ad } = searchParams;

  return (
    <>
    <SiteHeader />
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-moss-50 text-3xl text-moss-600">
        ✓
      </div>
      <h1 className="mt-6 font-display text-3xl text-ink">Randevunuz oluşturuldu.</h1>
      <p className="mt-2 text-stone-500">
        {ad ? `${ad}, r` : "R"}andevu detaylarınız aşağıda. İşletme randevunuzu onayladığında
        bilgilendirileceksiniz.
      </p>

      <dl className="mt-8 w-full space-y-2 rounded-xl2 border border-stone-200 bg-white p-5 text-left text-sm">
        {isletmeAdi && (
          <div className="flex justify-between border-b border-stone-100 pb-2">
            <dt className="text-stone-500">İşletme</dt>
            <dd className="font-medium text-ink">{isletmeAdi}</dd>
          </div>
        )}
        {hizmet && (
          <div className="flex justify-between border-b border-stone-100 pb-2">
            <dt className="text-stone-500">Hizmet</dt>
            <dd className="font-medium text-ink">{hizmet}</dd>
          </div>
        )}
        {tarih && (
          <div className="flex justify-between border-b border-stone-100 pb-2">
            <dt className="text-stone-500">Tarih</dt>
            <dd className="font-medium text-ink">{tarih}</dd>
          </div>
        )}
        {saat && (
          <div className="flex justify-between pb-1">
            <dt className="text-stone-500">Saat</dt>
            <dd className="font-medium text-ink">{saat}</dd>
          </div>
        )}
      </dl>

      {randevuId && (
        <p className="mt-4 max-w-sm text-xs text-stone-400">
          Randevunu iptal etmek, yeniden planlamak veya check-in kodu oluşturmak için{" "}
          <Link href={`/randevu/${randevuId}`} className="focus-ring text-moss-700 hover:underline">
            bu bağlantıyı
          </Link>{" "}
          kaydet.
        </p>
      )}

      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link
          href="/"
          className="focus-ring rounded-lg border border-stone-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-ink hover:border-stone-300"
        >
          Ana sayfaya dön
        </Link>
        {isletme && (
          <Link
            href={`/isletme/${isletme}`}
            className="focus-ring rounded-lg bg-ink px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-moss-700"
          >
            İşletmeye dön
          </Link>
        )}
      </div>
    </main>
    </>
  );
}
