"use client";

import { useState, useTransition } from "react";
import { runDueReminders } from "@/lib/admin-actions";

// Gerçek bir cron job bağlanana kadar (bkz. generate_due_reminders SQL
// fonksiyonu) admin bu butonla 24 saat içindeki onaylı randevular için
// hatırlatma bildirimi üretebilir. İdempotent — aynı randevu için ikinci kez
// bildirim oluşturmaz.
export function RunRemindersButton() {
  const [result, setResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const r = await runDueReminders();
      setResult(r.ok ? `${r.count} hatırlatma oluşturuldu.` : r.error);
    });
  }

  return (
    <div className="rounded-xl2 border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium text-ink">Yaklaşan randevu hatırlatmaları</p>
      <p className="mt-1 text-xs text-stone-500">
        Gerçek bir zamanlanmış görev (cron) henüz bağlı değil. 24 saat içinde başlayacak onaylı
        randevular için elle hatırlatma üretebilirsiniz.
      </p>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="focus-ring mt-3 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
      >
        {isPending ? "Oluşturuluyor…" : "Hatırlatmaları Oluştur"}
      </button>
      {result && <p className="mt-2 text-sm text-stone-600">{result}</p>}
    </div>
  );
}
