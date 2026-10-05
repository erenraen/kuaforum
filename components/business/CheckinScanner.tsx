"use client";

import { useState, useTransition } from "react";
import { redeemCheckin, type CheckinResult } from "@/lib/business-actions";
import { formatTime } from "@/lib/utils";

export function CheckinScanner() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    startTransition(async () => {
      const r = await redeemCheckin(token);
      setResult(r);
      setToken("");
    });
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Check-in</h1>
      <p className="mt-1 max-w-md text-sm text-stone-500">
        Müşterinin gösterdiği kodu buraya gir. Kamera ile QR okutma şu an desteklenmiyor — kodu
        elle yazabilir veya okutucu cihazınız varsa buraya yazdırabilirsiniz.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          autoFocus
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="KFR-XXXXXXXXXX"
          className="focus-ring flex-1 rounded-lg border border-stone-200 px-4 py-3 font-mono text-sm uppercase tracking-wider"
        />
        <button
          type="submit"
          disabled={isPending}
          className="focus-ring rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-moss-700 disabled:opacity-60"
        >
          {isPending ? "Kontrol ediliyor…" : "Doğrula"}
        </button>
      </form>

      {result && (
        <div
          className={`mt-5 rounded-xl2 border p-5 ${
            result.ok
              ? result.alreadyScanned
                ? "border-clay-200 bg-clay-50"
                : "border-moss-200 bg-moss-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {result.ok ? (
            <>
              <p className={`font-medium ${result.alreadyScanned ? "text-clay-700" : "text-moss-700"}`}>
                {result.alreadyScanned ? "⚠️ Bu kod daha önce kullanılmış" : "✓ Check-in başarılı"}
              </p>
              <p className="mt-1 text-sm text-stone-700">{result.customerName} — {result.serviceName}</p>
              <p className="text-sm text-stone-500">{formatTime(result.startsAt)}</p>
            </>
          ) : (
            <p className="font-medium text-red-600">{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
