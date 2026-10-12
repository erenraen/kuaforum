"use client";

import { useState, useTransition } from "react";
import { redeemCheckin, type CheckinResult } from "@/lib/business-actions";
import { formatTime } from "@/lib/utils";
import { CameraQrScanner } from "./CameraQrScanner";

export function CheckinScanner() {
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function redeem(rawToken: string) {
    const value = rawToken.trim();
    if (!value) return;
    startTransition(async () => {
      // Kameradan okunan veriye GÜVENİLMEZ — token sunucuda tekrar doğrulanır
      // (redeem_checkin_token RPC: süre, tek kullanım, doğru işletme kontrolü).
      const r = await redeemCheckin(value);
      setResult(r);
      setToken("");
    });
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    redeem(token);
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Check-in</h1>
      <p className="mt-1 max-w-md text-sm text-stone-500">
        Müşterinin telefonundaki QR kodu kamerayla tara, ya da kodu elle gir.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setMode("camera")}
          className={`focus-ring rounded-full border px-4 py-1.5 text-sm font-medium ${
            mode === "camera" ? "border-ink bg-ink text-white" : "border-stone-200 bg-white text-stone-600"
          }`}
        >
          📷 QR Tara
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`focus-ring rounded-full border px-4 py-1.5 text-sm font-medium ${
            mode === "manual" ? "border-ink bg-ink text-white" : "border-stone-200 bg-white text-stone-600"
          }`}
        >
          ⌨️ Kod ile Check-in
        </button>
      </div>

      <div className="mt-5 max-w-sm">
        {mode === "camera" ? (
          <CameraQrScanner onDetected={redeem} onCancel={() => setMode("manual")} />
        ) : (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 sm:flex-row">
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
        )}
      </div>

      {isPending && mode === "camera" && (
        <p className="mt-3 text-sm text-stone-500">Kod kontrol ediliyor…</p>
      )}

      {result && (
        <div
          className={`mt-5 max-w-sm rounded-xl2 border p-5 ${
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
          <button
            onClick={() => {
              setResult(null);
              setMode("camera");
            }}
            className="focus-ring mt-3 text-sm text-stone-500 hover:text-ink"
          >
            Yeni tarama
          </button>
        </div>
      )}
    </div>
  );
}
