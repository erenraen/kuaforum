import { AppointmentHub } from "@/components/customer/AppointmentHub";

export default function AppointmentHubPage({ params }: { params: { id: string } }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl text-ink">Randevum</h1>
      <p className="mt-1 text-sm text-stone-500">
        Randevunu görüntüle, iptal et, yeniden planla veya check-in kodu oluştur.
      </p>
      <div className="mt-6">
        <AppointmentHub appointmentId={params.id} />
      </div>
    </main>
  );
}
