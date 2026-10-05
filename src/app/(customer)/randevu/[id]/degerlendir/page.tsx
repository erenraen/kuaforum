import Link from "next/link";
import { getAppointmentForReview } from "@/lib/booking/actions";
import { ReviewForm } from "@/components/customer/ReviewForm";

export default async function ReviewPage({ params }: { params: { id: string } }) {
  const appt = await getAppointmentForReview(params.id);

  if (!appt) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">Randevu bulunamadı</h1>
        <p className="mt-2 text-stone-500">Bağlantı geçersiz olabilir.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <nav className="mb-6 text-sm text-stone-500">
        <Link href={`/isletme/${appt.business_slug}`} className="focus-ring hover:text-ink">
          {appt.business_name}
        </Link>
      </nav>

      <h1 className="font-display text-2xl text-ink">Randevunu değerlendir</h1>
      <p className="mt-1 text-sm text-stone-500">
        {appt.service_name} · {new Date(appt.starts_at).toLocaleDateString("tr-TR")}
      </p>

      <div className="mt-6">
        {appt.already_reviewed ? (
          <div className="rounded-xl2 border border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-500">
            Bu randevu için zaten bir yorum bırakılmış.
          </div>
        ) : appt.status !== "completed" ? (
          <div className="rounded-xl2 border border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-500">
            Yorum bırakabilmek için randevunun tamamlanmış olması gerekiyor.
          </div>
        ) : (
          <ReviewForm appointmentId={appt.appointment_id} />
        )}
      </div>
    </main>
  );
}
